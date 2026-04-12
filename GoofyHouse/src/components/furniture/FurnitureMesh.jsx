import Chair from './Chair'
import FurnitureLight from './FurnitureLight'
import WallClock from './WallClock'
import Plant from './Plant'
import Fridge from './Fridge'
import Fan from './Fan'
import Painting from './Painting'
import GlassPane from './GlassPane'
import Staircase from './Staircase'
import Toys from './Toys'
import Backpack from './Backpack'
import Mop from './Mop'
import Jacket from './Jacket'

export default function FurnitureMesh({ type, position }) {
  switch (type) {
    case 'chair':     return <Chair />
    case 'light':     return <FurnitureLight />
    case 'clock':     return <WallClock />
    case 'plant':     return <Plant />
    case 'fridge':    return <Fridge />
    case 'fan':       return <Fan />
    case 'painting':  return <Painting position={position} />
    case 'glass':     return <GlassPane />
    case 'staircase': return <Staircase />
    case 'toys':      return <Toys />
    case 'backpack':  return <Backpack />
    case 'mop':       return <Mop />
    case 'jacket':    return <Jacket />
    default:          return null
  }
}
