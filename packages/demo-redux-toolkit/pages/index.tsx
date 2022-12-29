import React from 'react';
import Link from 'next/link';

export default function IndexPage() {
    return (
        <div>
            <h3>Rendering without state</h3>
            You can see &quot;Rendered content: undefined&quot; in browser console after navigating between these pages:
            <br />
            <br />
            <Link href="/subject/1" prefetch={false}>
                Go to problem pages
            </Link>
            <br />
            <Link href="/detail/1" prefetch={false}>
                Go to detail pages
            </Link>
            <br />
            <Link href="/gipp" prefetch={false}>
                Go to gipp page
            </Link>
            <br />
            <Link href="/pokemon/pikachu" prefetch={false}>
                Go to Pokemon
            </Link>
        </div>
    );
}
