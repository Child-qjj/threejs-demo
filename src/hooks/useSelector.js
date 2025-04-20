import { Vector2, Raycaster, Vector3 } from 'three/src/Three.WebGPU'

export default function useSelector(scene, sceneHelpers) {
  const mouse = new Vector2()
  const raycaster = new Raycaster()
  let selectedObject = null

  const getIntersects = (raycaster) => {
    const objects = []

    scene.traverseVisible(function (child) {
      objects.push(child)
    })

    sceneHelpers.traverseVisible(function (child) {
      if (child.name === 'picker') objects.push(child)
    })

    return raycaster.intersectObjects(objects, false)
  }

  const getPointerIntersects = (point, camera, objects) => {
    mouse.set(point.x * 2 - 1, -(point.y * 2) + 1)
    raycaster.setFromCamera(mouse, camera)
    const intersectionPoint = new Vector3()
    const intersections = []
    objects.forEach((object) => {
      const obb = object.userData.obb

      const ray = raycaster.ray

      if (obb.intersectRay(ray, intersectionPoint) !== null) {
        const distance = ray.origin.distanceTo(intersectionPoint)
        intersections.push({ distance: distance, object: object })
      }
    })
    return getIntersects(raycaster)
  }

  const select = (object) => {
    if (selectedObject === object) return
    selectedObject = object
    return object
  }

  const deselect = () => {
    select(null)
  }

  return {
    getPointerIntersects,
    select,
    deselect,
    get selected() {
      return selectedObject
    },
  }
}
