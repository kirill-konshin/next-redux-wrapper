import React from 'react';
import Link from 'next/link';

export default function IndexPage() {
    return (
        <div>
            <h3>Rendering without state</h3>
            You can see &quot;Rendered content: undefined&quot; in browser console after navigating between these pages:
            <br />
            <br />
            <Link href="/subject/1">
                <a>Go to problem pages</a>
            </Link>
        </div>
    );
}
