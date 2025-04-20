import { PerspectiveCamera, CameraHelper } from 'three/src/Three.WebGPU'
export default function useCamera({ fov, aspect, near, far, withHelper = true }) {
  const camera = new PerspectiveCamera(fov, aspect, near, far)
  camera.position.set(0, 0, 10)
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
  if (withHelper) {
    const helper = new CameraHelper(camera)
    helper.visible = true
    camera.add(helper)
  }
  const getCameraView = (width, height) => {
    const view = camera.getView(width, height)
    const viewport = camera.getViewport(width, height)
    const x = viewport.x
    const y = viewport.y
    const w = viewport.z
    const h = viewport.w
    return {
      position: camera.position,
      rotation: camera.rotation,
      view,
      viewport: {
        x,
        y,
        width: w,
        height: h,
      },
    }
  }

  const focusObject = (object) => {
    const { position, rotation } = object
    camera.position.copy(position)
    camera.rotation.copy(rotation)
    camera.updateProjectionMatrix()
  }
  return {
    camera,
    getCameraView,
    focusObject,
  }
}
