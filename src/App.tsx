/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import F1Section from './pages/F1Section';
import MotoGPSection from './pages/MotoGPSection';
import ComingSoon from './pages/ComingSoon';


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/f1" replace />} />   {/* bare localhost:3000 → /f1 */}
      <Route path="/f1/*" element={<F1Section />} />               {/* everything you have today */}
      <Route path="/motogp/*" element={<MotoGPSection sport="MotoGP" />} />
      <Route path="/gt3/*" element={<ComingSoon sport="GT3" />} />
      <Route path="/formulae/*" element={<ComingSoon sport="FormulaE" />} />
      <Route path="*" element={<Navigate to="/f1" replace />} />    unknown URL
    </Routes>
  )

}
