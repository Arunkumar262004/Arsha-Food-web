import React, { useContext } from 'react'
import { StoreContext } from '../../context/Storecontext'
import { STORE_INFO } from '../../config/store'
import { Marquee } from '../Motion'
import Icon from '../Icon'
import './Topbar.css'

const Topbar = () => {
  const { settings } = useContext(StoreContext)
  const freeOver = `${settings.currencySymbol}${settings.freeDeliveryThreshold}`

  return (
    <div className="topbar">
      <div className="container topbar-inner">
        <div className="topbar-side">
          <a href={`tel:${STORE_INFO.phone.replace(/\s/g, '')}`}><Icon name="phone" size={15} />{STORE_INFO.phone}</a>
          <span className="topbar-hide-md"><Icon name="mapPin" size={15} />{STORE_INFO.address}</span>
        </div>

        <div className="topbar-center">
          <Marquee speed={22}>
            <span><Icon name="sparkle" size={13} />Freshly cooked, every order</span>
            <span><Icon name="truck" size={13} />Free delivery over {freeOver}</span>
            <span><Icon name="shield" size={13} />Hygienic kitchen · Sealed packaging</span>
          </Marquee>
        </div>

        <div className="topbar-side end">
          <span className="topbar-hide-md"><Icon name="clock" size={15} />{STORE_INFO.hours}</span>
          <span><Icon name="truck" size={15} />Same-day delivery</span>
        </div>
      </div>
    </div>
  )
}

export default Topbar
