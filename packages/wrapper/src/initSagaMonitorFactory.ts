import {SagaMonitor} from '@redux-saga/core';
import {effect as isEffect, task as isTask} from '@redux-saga/is';
import {Effect} from '@redux-saga/types';
import {spawn} from 'redux-saga/effects';

export const DEFAULT_TIMEOUT = 120_000; // 2 minutes. No timeouts at all are generally a very bad idea.

export interface InitSagaMonitor {
    readonly monitor: SagaMonitor;
    readonly initCompletion: Promise<void>;
    readonly start: () => void;
}

export function createInitSagaMonitor(timeout = DEFAULT_TIMEOUT): InitSagaMonitor {
    const rootEffects: MonitoredEffect[] = [];
    const effectIdToEffectIndex = new Map<number, MonitoredEffect>();

    let initCompletionResolver!: () => void;
    let initCompletionRejector!: (error: Error) => void;
    let isStarted = false;
    let isResolved = false;
    let monitor!: SagaMonitor;

    const initCompletion = new Promise<void>((resolve, reject) => {
        initCompletionResolver = resolve;
        initCompletionRejector = reject;
        monitor = {
            rootSagaStarted({effectId, saga, args}): void {
                registerEffect(effectId, null, spawn(saga, ...args));
            },
            effectTriggered({effectId, parentEffectId, effect}): void {
                if (isEffect(effect)) {
                    registerEffect(effectId, parentEffectId, effect);
                    if (effect.type === 'TAKE') {
                        checkInitCompletion();
                    }
                }
            },
            effectResolved(effectId, result): void {
                const effect = effectIdToEffectIndex.get(effectId);
                if (effect) {
                    if (isTask(result)) {
                        result.toPromise().then(() => {
                            effect.isPending = false;
                            checkInitCompletion();
                        }, (error) => {
                            isResolved = true;
                            reject(error);
                        });
                    } else {
                        effect.isPending = false;
                        checkInitCompletion();
                    }
                }
            },
            effectRejected(effectId): void {
                resolveFailedOrCancelledEffect(effectId);
            },
            effectCancelled(effectId): void {
                resolveFailedOrCancelledEffect(effectId);
            },
        };
    });

    return {
        initCompletion,
        monitor,
        start(): void {
            // Implementation note: While it is possible, in certain situations, to auto-start the monitor at the right moment (a saga triggers an effect that
            // is a CPS or a CALL to a function that is not a generator and does not resolve in the next tick, i.e. is asynchronous; or all sagas have
            // terminated), this would not be compatible with all use cases, e.g. a page dispatching an action, that makes sagas do anything meaningful at
            // all, only in certain conditions.
            // A tempting alternative is to start the monitor asynchronously in the next tick after it has been created, however, this would not be compatible
            // with the use case of a page component's getXXXProps asynchronously dispatching a redux action that would start the sagas to do their work.
            // Ergo, to mitigate any possible confusion caused by this behavior, this is not even an opt-in feature. At least, not yet.

            if (isStarted) {
                throw new Error('This init monitor has already been started. Please create a new one for every redux store.');
            }

            isStarted = true;

            if (timeout > 0) {
                setTimeout(() => {
                    if (isResolved) {
                        return;
                    }

                    isResolved = true;
                    const pendingEffects = trimResolvedEffects(rootEffects);
                    initCompletionRejector(Object.assign(new Error(
                        `The following redux saga effects did not finish or block on a take effect within the configured timeout of ${timeout} ` +
                        `milliseconds:\n${formatEffectForest(pendingEffects)}`,
                    ), {name: 'TimeoutError', timeout}));
                }, timeout);
            }

            checkInitCompletion();
        },
    };

    function registerEffect(effectId: number, parentId: number | null, descriptor: Effect): void {
        const effect: MonitoredEffect = {
            id: effectId,
            parent: (parentId !== null && effectIdToEffectIndex.get(parentId)) || null,
            descriptor,
            children: [],
            isPending: true,
        };
        if (effect.parent === null) {
            rootEffects.push(effect);
        } else {
            effect.parent.children.push(effect);
        }
        effectIdToEffectIndex.set(effectId, effect);
    }

    function resolveFailedOrCancelledEffect(effectId: number): void {
        const effect = effectIdToEffectIndex.get(effectId);
        if (effect) {
            effect.isPending = false;
        }
    }

    function checkInitCompletion(): void {
        if (isStarted && !isResolved && isInitCompleted(rootEffects)) {
            isResolved = true;
            initCompletionResolver();
        }
    }
}

interface MonitoredEffect {
    readonly id: number;
    readonly parent: MonitoredEffect | null;
    readonly descriptor: Effect;
    readonly children: MonitoredEffect[];
    isPending: boolean;
}

function isInitCompleted(effects: readonly MonitoredEffect[]): boolean {
    return effects.every(isTreeResolvedOrTake);
}

function isTreeResolvedOrTake(effect: MonitoredEffect): boolean {
    return (effect.children.length && effect.children.every(isTreeResolvedOrTake)) || isResolvedOrTake(effect);
}

function isResolvedOrTake(effect: MonitoredEffect): boolean {
    return !effect.isPending || effect.descriptor.type === 'TAKE';
}

function trimResolvedEffects(effects: readonly MonitoredEffect[]): MonitoredEffect[] {
    const pendingEffects: MonitoredEffect[] = [];
    for (const effect of effects) {
        const pendingChildren = trimResolvedEffects(effect.children);
        if ((!effect.children.length || pendingChildren.length) && !isResolvedOrTake(effect)) {
            pendingEffects.push({
                ...effect,
                children: pendingChildren,
            });
        }
    }
    return pendingEffects;
}

function formatEffectForest(rootEffects: readonly MonitoredEffect[]): string {
    return formatLevel(rootEffects, '').join('\n');

    function formatLevel(effects: readonly MonitoredEffect[], indentation: string): string[] {
        const lines: string[] = [];
        for (const effect of effects) {
            const formattedEffect = `#${effect.id} ${effect.descriptor.type}`;
            const state = effect.isPending ? 'pending' : 'resolved';
            switch (effect.descriptor.type) {
                case 'FORK':
                case 'CALL':
                    lines.push(`${indentation}${formattedEffect}: ${effect.descriptor.payload.fn.name} ${state}`);
                    break;
                default:
                    lines.push(`${indentation}${formattedEffect} ${state}`);
                    break;
            }
            lines.push(...formatLevel(effect.children, `  ${indentation}`));
        }
        return lines;
    }
}
