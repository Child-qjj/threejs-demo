import {
  BoxGeometry,
  MeshStandardMaterial,
  Mesh,
  SphereGeometry,
  Points,
  BufferGeometry,
  Float32BufferAttribute,
  PointsMaterial,
  Vector3,
} from 'three/src/Three.WebGPU'
import { OBB } from 'three/examples/jsm/math/OBB.js'

export default function useSceneObjects() {
  // 添加立方体
  const addCube = () => {
    const size = new Vector3(3, 1, 1)
    const geometry = new BoxGeometry(size.x, size.y, size.z)

    geometry.userData.obb = new OBB()

    geometry.userData.obb.halfSize.copy(size).multiplyScalar(0.5)

    const material = new MeshStandardMaterial({ color: 0x00ff00 })
    // material
    // 性能优化可以考虑 object.matrixAutoUpdate = false;
    const cube = new Mesh(geometry, material)

    return cube
  }

  // 添加球体
  const addSphere = () => {
    const geometry = new SphereGeometry(0.5, 32, 32)

    const material = new MeshStandardMaterial({ color: 0xff0000 })
    const sphere = new Mesh(geometry, material)
    return sphere
  }

  // 添加点
  const addPoint = () => {
    const geometry = new BufferGeometry()
    const vertices = new Float32Array([0, 0, 0])
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
    const material = new PointsMaterial({ color: 0x0000ff, size: 0.1 })
    const point = new Points(geometry, material)
    return point
  }

  return {
    addCube,
    addSphere,
    addPoint,
  }
}
