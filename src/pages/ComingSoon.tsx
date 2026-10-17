/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

export default function ComingSoon({ sport }: { sport: string }) {

    return (
        <div className="min-h-screen flex flex-col items-center justify-center antialiased">
            <span className="text-2xl">{sport}: coming soon</span>
        </div>
    );
}
