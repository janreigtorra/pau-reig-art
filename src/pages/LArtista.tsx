import React, { useContext, useMemo } from 'react';
import { LanguageContext } from '../App';
import artist from '../../artist.json';
import contactImgUrl from '../../fotos_generals/photo2.jpg';

export default function LArtista() {
  const { language } = useContext(LanguageContext);
  const paragraphs = useMemo(() => artist[language] as string[], [language]);

  return (
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
  );
}

