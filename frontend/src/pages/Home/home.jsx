import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../../component/Header/Header'
import Explorer from '../../component/Explorermenu/Emplorer'
import Fooddisplay from '../../component/fooddisplay/Fooddisplay'
import App_download from '../../component/App_download/app_download.jsx'

const Home = () => {
  const [Category, Setcategory] = useState("All")
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const query = params.get('q') || ''

  useEffect(() => {
    document.title = "Arsha · Order food online";
  }, []);

  return (
    <div>
      <Header />
      <Explorer Category={Category} Setcategory={Setcategory} />
      <Fooddisplay Category={Category} query={query} onClearSearch={() => navigate('/#menu')} />
      <App_download />
    </div>
  )
}

export default Home
