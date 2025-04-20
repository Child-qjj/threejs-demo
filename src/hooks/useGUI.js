import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
export default function useGUI() {
  let gui = null
  function initGui() {
    gui = new GUI()
  }
}
