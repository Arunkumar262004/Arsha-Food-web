import React from 'react';
import './Appdownload.css';
import { assets } from '../../assets/assets';

const AppDownload = () => {
  return (
    <section className='container' id='app-download'>
      <div className="app-dl">
        <div>
          <div className="section-eyebrow">Coming soon</div>
          <h2 className="section-title">Order even faster with the Arsha app</h2>
          <p className="section-sub">Track your delivery live, save favourites and reorder in one tap.</p>
        </div>
        <div className="app-dl-stores">
          <img src={assets.play_store} alt='Get it on Google Play' />
          <img src={assets.app_store} alt='Download on the App Store' />
        </div>
      </div>
    </section>
  );
};

export default AppDownload;
