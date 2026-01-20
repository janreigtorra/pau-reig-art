import React, { useContext, useMemo } from 'react';
import { LanguageContext } from '../App';
import SEO from '../components/SEO';
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

  const seoDescription = language === 'catala'
    ? 'Descobreix el taller de Pau Reig a Solsona on es creen gegants i figures festives amb tècniques tradicionals. Veu el procés artesanal d\'escultura i construcció.'
    : 'Discover Pau Reig\'s workshop in Solsona where giants and festive figures are created using traditional techniques. See the handcrafted sculpture and construction process.';

  return (
    <>
      <SEO
        title={language === 'catala' ? 'El Taller' : 'The Workshop'}
        description={seoDescription}
        url="https://www.paureig.art/taller"
        locale={language === 'catala' ? 'ca_ES' : 'en_US'}
      />
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
    </>
  );
}

