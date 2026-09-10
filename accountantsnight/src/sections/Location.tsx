import { useState } from 'react';
import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';
import { event } from '../data/event';
import { transport } from '../data/transport';
import { createKakaoMapUrl, createNaverMapUrl } from '../utils/maps';

const tabs = [transport.subway, transport.bus, transport.car];

export function Location() {
  const [active, setActive] = useState(0);
  const query = '서울신라호텔 영빈관';

  return (
    <RevealSection className="section--paper location" label="오시는 길">
      <div className="section-inner">
        <SectionHeader eyebrow="LOCATION" />
        <address className="location-card">
          <span>VENUE</span>
          <strong>{event.venue}</strong>
          <p>{event.address}</p>
          <div className="button-row">
            <a className="button button--dark" href={createNaverMapUrl(query)} target="_blank" rel="noreferrer">
              네이버 지도에서 보기
            </a>
            <a className="button button--outline-dark" href={createKakaoMapUrl(query)} target="_blank" rel="noreferrer">
              카카오맵에서 보기
            </a>
          </div>
        </address>
        <div className="transport">
          <div className="segment" role="tablist" aria-label="교통 안내">
            {tabs.map((tab, index) => (
              <button
                key={tab.title}
                type="button"
                role="tab"
                aria-selected={active === index}
                className={active === index ? 'is-active' : ''}
                onClick={() => setActive(index)}
              >
                {tab.title}
              </button>
            ))}
          </div>
          <div className="transport__body" role="tabpanel">
            <ul>
              {tabs[active].items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </RevealSection>
  );
}
