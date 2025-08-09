import React, { useContext, useMemo } from 'react';
import { LanguageContext } from '../App';
import taller from '../../taller.json';
import destacatUrl from '../../fotos_generals/photo5.jpg';

export default function ElTaller() {
  const { language } = useContext(LanguageContext);
  const paragraphs = useMemo(() => taller[language] as string[], [language]);
  const albumImages = useMemo(() => {
    const modules = import.meta.glob('../../fotos_generals/eltaller/*.{png,jpg,jpeg,webp}', { eager: true, as: 'url' }) as Record<string, string>;
    return Object.entries(modules)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, url]) => url);
  }, []);

  return (
    <div className="container section">
      <h1>{language === 'catala' ? 'El Taller' : 'The Workshop'}</h1>
      <p className="lead">{language === 'catala' ? 'Espai de creació' : 'Creation space'}</p>
      <div className="two-col">
        <div className="text-justify text-lg">
          {paragraphs.map((p, idx) => (
            <p key={idx} style={{ whiteSpace: 'pre-line', marginTop: idx === 0 ? 0 : 16 }}>{p}</p>
          ))}
        </div>
        <div className="artist-photos">
          <img src={destacatUrl} alt="Taller destacat" />
        </div>
      </div>

      <div className="album-grid" aria-label={language === 'catala' ? 'Àlbum del taller' : 'Workshop album'}>
        {albumImages.map((src, idx) => (
          <img key={idx} src={src} alt={(language === 'catala' ? 'Foto del taller ' : 'Workshop photo ') + (idx + 1)} />
        ))}
      </div>
    </div>
  );
}

