import React from 'react';
import {useRouter} from 'next/router';
import {wrapper, pokemonApi, useGetPokemonByNameQuery} from '../../store';
import {useStore} from 'react-redux';

export default function Pokemon(props: any) {
    wrapper.useHydration(props);
    const {query} = useRouter();

    console.log('State on render', useStore().getState());
    const {data} = useGetPokemonByNameQuery(query.pokemon as string); // data is undefined for the first render

    if (!data) {
        return <div>Loading</div>;
    }

    return <div>Name: {data?.name}</div>;
}

export const getServerSideProps = wrapper.getServerSideProps(store => async context => {
    const pokemon = context.params?.pokemon;
    if (typeof pokemon === 'string') {
        console.log('DISPATCH');
        store.dispatch(pokemonApi.endpoints.getPokemonByName.initiate(pokemon));
    }

    await Promise.all(pokemonApi.util.getRunningOperationPromises());

    console.log('SERVER STATE', store.getState().pokemonApi);

    return {
        props: {},
    };
});
