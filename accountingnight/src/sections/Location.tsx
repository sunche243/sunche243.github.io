import { useState } from 'react';
import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';
import { event } from '../data/event';
import { transport } from '../data/transport';
import { createKakaoMapUrl, createNaverMapUrl } from '../utils/maps';

const tabs = [transport.subway, transport.bus, transport.car];

export function Location() {
  const [active, setActive] = useState<number | null>(0);
  const query = '서울신라호텔 영빈관';

  return (
    <RevealSection className="section--paper location" label="오시는 길">
      <div className="section-inner">
        <SectionHeader eyebrow="LOCATION" />
        <address className="location-card">
          <strong>
            {event.venue.split(' ').map((word) => (
              <span key={word}>{word}</span>
            ))}
          </strong>
          <p>{event.address}</p>
          <div className="location-actions">
            <a className="button button--map" href={createNaverMapUrl(query)} target="_blank" rel="noreferrer">
              네이버 지도
            </a>
            <a className="button button--map" href={createKakaoMapUrl(query)} target="_blank" rel="noreferrer">
              카카오맵
            </a>
          </div>
        </address>
        <div className="transport" aria-label="교통 안내">
          {tabs.map((tab, index) => {
            const open = active === index;
            const panelId = `transport-panel-${index}`;

            return (
              <div className="transport__item" key={tab.title}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setActive(open ? null : index)}
              >
                <span>{tab.title}</span>
                <i aria-hidden="true">{open ? '−' : '+'}</i>
              </button>
                {open ? (
                  <div className="transport__body" id={panelId} role="region">
                    <ul>
                      {tab.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </RevealSection>
  );
}
