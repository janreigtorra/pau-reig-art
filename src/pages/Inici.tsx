import React, { useRef, useState } from 'react';
import heroVideoUrl from '../../videos/video.mp4';
import contactImgUrl from '../../fotos_generals/photo0.jpg';

export default function Inici() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);

  const handleLoaded = () => {
    setIsReady(true);
    // Ensure playback (some browsers require a play() call even with muted)
    videoRef.current?.play().catch(() => {});
  };

  return (
    <>
      <section className="hero">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={handleLoaded}
          className={isReady ? 'video-visible' : 'video-hidden'}
        >
          <source src={heroVideoUrl} type="video/mp4" />
        </video>
        <div className="hero-overlay" />
      </section>
      <section className="contact-section">
        <div className="container">
          <div className="contact-card">
            <img className="contact-img" src={contactImgUrl} alt="Pau Reig contact" />
            <div>
              <h3 className="contact-title">Contacte</h3>
              <div className="contact-list">
              <div className="contact-item">
                <svg className="icon" viewBox="0 0 24 24" aria-hidden>
                  <path fill="currentColor" d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 2v.01L12 12 4 6.01V6h16ZM4 18V8l8 6 8-6v10H4Z"/>
                </svg>
                <a href="mailto:paureig.workshop@gmail.com">paureig.workshop@gmail.com</a>
              </div>
              <div className="contact-item">
                <svg className="icon" viewBox="0 0 24 24" aria-hidden>
                  <path fill="currentColor" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5zM18 6.25a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 18 6.25z"/>
                </svg>
                <a href="https://www.instagram.com/paureig.art/" target="_blank" rel="noreferrer">@paureig.art</a>
              </div>
              <div className="contact-item">
                <svg className="icon" viewBox="0 0 24 24" aria-hidden>
                  <path fill="currentColor" d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24 11.36 11.36 0 0 0 3.56.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 7a1 1 0 0 1 1-1h2.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.56 1 1 0 0 1-.24 1.01l-2.21 2.22Z"/>
                </svg>
                <a href="tel:+346545530689">+34 654 55 30 689</a>
              </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

