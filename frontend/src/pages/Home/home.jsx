import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../../component/Header/Header'
import Explorer from '../../component/Explorermenu/Emplorer'
import Fooddisplay from '../../component/fooddisplay/Fooddisplay'
import App_download from '../../component/App_download/app_download.jsx'
import { Collections, DealOfDay, FeatureStrip, PromoBanners, Story, TickerBand } from '../../component/HomeSections/HomeSections'

const Home = () => {
  const [Category, Setcategory] = useState("All")
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const query = params.get('q') || ''

  useEffect(() => {
    document.title = "Arsha · Fresh food & coffee, delivered";
  }, []);

  return (
    <div className="home">
      <Header />
      <TickerBand />
      <FeatureStrip />
      <Explorer Category={Category} Setcategory={Setcategory} />
      <PromoBanners Setcategory={Setcategory} />
      <Fooddisplay Category={Category} Setcategory={Setcategory} query={query} onClearSearch={() => navigate('/#menu')} />
      <DealOfDay />
      <Collections Setcategory={Setcategory} />
      <Story />
      <App_download />
    </div>
  )
}

export default Home
