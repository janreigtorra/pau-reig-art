import React, { useContext, useMemo } from 'react';
import { LanguageContext } from '../App';
import SEO from '../components/SEO';
import artist from '../../artist.json';
import contactImgUrl from '../../fotos_generals/photo2.jpg';

export default function LArtista() {
  const { language } = useContext(LanguageContext);
  const paragraphs = useMemo(() => artist[language] as string[], [language]);

  const seoDescription = language === 'catala'
    ? 'Descobreix Pau Reig, artista i constructor de gegants de Solsona. Format a l\'Escola Massana i Florence Academy of Art. Especialitzat en escultura i imatgeria festiva catalana.'
    : 'Discover Pau Reig, artist and giant builder from Solsona. Trained at Escola Massana and Florence Academy of Art. Specialized in sculpture and Catalan festive imagery.';

  return (
    <>
      <SEO
        title={language === 'catala' ? "L'Artista" : 'The Artist'}
        description={seoDescription}
        url="https://www.paureig.art/artista"
        locale={language === 'catala' ? 'ca_ES' : 'en_US'}
      />
      <div className="container section container-wide">
        <h1>{language === 'catala' ? "L'Artista" : 'The Artist'}</h1>
      <p className="lead">{language === 'catala' ? 'Biografia i trajectòria' : 'Biography and background'}</p>
      <div className="two-col">
        <div className="text-justify text-lg">
          {paragraphs.map((p, idx) => (
            <p key={idx} style={{ whiteSpace: 'pre-line', marginTop: idx === 0 ? 0 : 16 }}>{p}</p>
          ))}
        </div>
        <div className="artist-photos">
          <img src={contactImgUrl} alt="Artist" />
        </div>
      </div>
    </div>
    </>
  );
}

