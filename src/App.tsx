import { Navigate, Route, Routes } from 'react-router';
import { CityMap } from './pages/cidade/CityMap';
import { HeroCreator } from './pages/cidade/HeroCreator';
import { MestreVisit } from './pages/cidade/MestreVisit';
import { PlaceVisit } from './pages/cidade/PlaceVisit';
import { StartScreen } from './pages/cidade/StartScreen';

/** Cataguases para crianças: mapa da cidade, pontos turísticos e Mestres do Saber. */
export function App() {
  return (
    <Routes>
      <Route index element={<StartScreen />} />
      <Route path="personagem" element={<HeroCreator />} />
      <Route path="mapa" element={<CityMap />} />
      <Route path="lugar/:id" element={<PlaceVisit />} />
      <Route path="mestre/:id" element={<MestreVisit />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
