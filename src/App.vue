<script setup>
import { onMounted, useTemplateRef, nextTick, ref, reactive, computed } from 'vue'
import { vOnClickOutside } from '@vueuse/components'
import { Tween, Group } from '@tweenjs/tween.js'
import {
  Scene,
  EquirectangularReflectionMapping,
  DirectionalLight,
  Vector3,
  Mesh,
  MeshBasicMaterial,
  BoxGeometry,
  Clock,
  WebGPURenderer,
} from 'three/src/Three.WebGPU.js'

import { OBB } from 'three/examples/jsm/math/OBB.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'

import useHelpers from './hooks/useHelpers'
import useCamera from './hooks/useCamera'
import useSceneObjects from './hooks/useSceneObjects'
import useSelector from './hooks/useSelector'
import useStats from './hooks/useStats'
import useText from './hooks/useText'

let renderer,
  scene,
  selector,
  camera,
  controls,
  sceneOperations,
  sceneHelpers,
  transformControls,
  hitbox,
  clock,
  stats,
  editingText
let objectRotate = true
const textInstance = useText()

const menus = [
  {
    label: '添加正方体',
    value: 'addCube',
  },
  {
    label: '添加球体',
    value: 'addSphere',
  },
  {
    label: '添加点',
    value: 'addPoint',
  },
  {
    label: '删除点',
    value: 'deletePoint',
  },
]

const canvasRef = useTemplateRef('canvasRef')
const visibleMenu = ref(false)
const needAnimation = ref(false)
const inputRef = useTemplateRef('inputRef')
const textValue = ref('')
const contextMenuPos = reactive({
  x: 0,
  y: 0,
})

const editingPosition = reactive({
  x: -1,
  y: -1,
})

const idToObject = {}
const initialPos = new Vector3()
const Groups = new Group()

const menuStyle = computed(() => {
  return {
    left: `${contextMenuPos.x}px`,
    top: `${contextMenuPos.y}px`,
  }
})

// 动画循环
function animate() {
  // console.log(containerRef.value, window.innerWidth)
  stats.update()
  controls.update()

  const delta = clock.getDelta()
  Object.values(idToObject).forEach((object) => {
    if (objectRotate) {
      object.rotation.x += delta * Math.PI * 0.2
      object.rotation.y += delta * Math.PI * 0.1
    }

    object.updateMatrix()
    object.updateMatrixWorld()

    // update OBB

    object.userData.obb.copy(object.geometry.userData.obb)
    object.userData.obb.applyMatrix4(object.matrixWorld)

    // reset

    object.material.color.setHex(0x00ff00)
  })

  const clientWidth = window.innerWidth
  const clientHeight = window.innerHeight
  const aspectRatio = clientWidth / clientHeight
  camera.aspect = aspectRatio

  camera.updateProjectionMatrix()
  Groups.update()
  renderer.autoClear = true
  renderer.render(scene, camera)
  renderer.autoClear = false
  renderer.render(sceneHelpers, camera)
}

function sortIntersections(a, b) {
  return a.distance - b.distance
}

const createObjects = async (num = 100) => {
  const size = new Vector3(1, 1, 1)
  const geometry = new BoxGeometry(size.x, size.y, size.z)
  geometry.userData.obb = new OBB()
  geometry.userData.obb.halfSize.copy(size).multiplyScalar(0.5)
  for (let i = 0; i < num; i++) {
    const object = new Mesh(geometry, new MeshBasicMaterial({ color: 0x00ff00 }))
    object.matrixAutoUpdate = false

    object.position.x = Math.random() * 80 - 40
    object.position.y = Math.random() * 80 - 40
    object.position.z = Math.random() * 80 - 40

    object.rotation.x = Math.random() * 2 * Math.PI
    object.rotation.y = Math.random() * 2 * Math.PI
    object.rotation.z = Math.random() * 2 * Math.PI

    object.scale.x = Math.random() + 0.5
    object.scale.y = Math.random() + 0.5
    object.scale.z = Math.random() + 0.5

    scene.add(object)

    // bounding volume on object level (this will reflect the current world transform)

    object.userData.obb = new OBB()

    idToObject[object.uuid] = object
  }
}

function onResize() {
  const clientWidth = window.innerWidth
  const clientHeight = window.innerHeight
  const aspectRatio = clientWidth / clientHeight
  camera.aspect = aspectRatio
  camera.updateProjectionMatrix()
  renderer.setSize(clientWidth, clientHeight)
}

const initScene = async () => {
  // 获取画布元素
  const clientWidth = window.innerWidth
  const clientHeight = window.innerHeight

  const aspectRatio = clientWidth / clientHeight

  // 创建场景
  scene = new Scene()

  // 辅助场景
  sceneHelpers = new Scene()
  // 加载hdr纹理
  const bgTexture = await loadTexture('/static/bg.hdr')
  // 处理纹理, 保证纹理的宽高比与画布的宽高比一致
  const imageAspect = bgTexture.image ? bgTexture.image.width / bgTexture.image.height : 1
  const aspect = imageAspect / aspectRatio

  bgTexture.offset.x = aspect > 1 ? (1 - 1 / aspect) / 2 : 0
  bgTexture.repeat.x = aspect > 1 ? 1 / aspect : 1

  bgTexture.offset.y = aspect > 1 ? 0 : (1 - aspect) / 2
  bgTexture.repeat.y = aspect > 1 ? 1 : aspect
  scene.background = bgTexture
  scene.environment = scene.background
  scene.environment.mapping = EquirectangularReflectionMapping
  // 时钟
  clock = new Clock()
  // 创建相机
  const { camera: currentCamera } = useCamera(75, aspectRatio, 0.1, 1000)
  camera = currentCamera
  // 创建 WebGPU 渲染器
  renderer = new WebGPURenderer({
    canvas: canvasRef.value,
    antialias: true,
    hrd: true,
    alpha: true,
  })
  renderer.setPixelRatio(window.devicePixelRatio)

  window.renderer = renderer // 挂载到window上，方便调试，比如renderer.debug.api
  renderer.setAnimationLoop(animate)
  await renderer.init() // WebGPU 需要异步初始化

  renderer.setSize(clientWidth, clientHeight)

  // controls
  controls = new OrbitControls(camera, renderer.domElement)
  // 辅助控制器
  transformControls = new TransformControls(camera, renderer.domElement)

  transformControls.addEventListener('axis-changed', function () {
    animate()
  })
  transformControls.addEventListener('objectChange', function () {
    // boxSelection.box.setFromObject(transformControls.object, true)
    // transformControls.object.add(hitbox)
    // hitbox.position.copy(transformControls.object.position)
    // hitbox.rotation.copy(transformControls.object.rotation)
    // hitbox.scale.copy(transformControls.object.scale)
    // hitbox.updateMatrixWorld()
    // animate()
  })
  transformControls.addEventListener('dragging-changed', (event) => {
    // 在变换时禁用 OrbitControls，避免冲突
    controls.enabled = !event.value
  })
  transformControls.addEventListener('mouseDown', function () {
    controls.enabled = false
  })
  transformControls.addEventListener('mouseUp', function () {
    controls.enabled = true
  })

  sceneHelpers.add(transformControls.getHelper())

  // helpers
  const { axesHelper } = useHelpers()
  // boxSelection = boxHelper()
  // hitbBox
  const size = new Vector3(1, 1, 1)
  const geometry = new BoxGeometry(size.x, size.y, size.z)

  // setup OBB on geometry level (doing this manually for now)

  geometry.userData.obb = new OBB()
  geometry.userData.obb.halfSize.copy(size).multiplyScalar(0.5)
  hitbox = new Mesh(geometry, new MeshBasicMaterial({ color: 0x000000, wireframe: true }))

  // sceneHelpers.add(boxSelection.selectionBox)
  sceneHelpers.add(axesHelper())

  // light
  const light = new DirectionalLight(0xffffff, 1)
  light.position.set(20, 20, 0)
  scene.add(light)

  // selector
  selector = useSelector(scene, sceneHelpers)

  // objects
  sceneOperations = useSceneObjects(scene, true)

  createObjects(100)

  // 处理窗口大小变化
  window.addEventListener('resize', onResize)

  window.addEventListener('contextmenu', (event) => {
    event.preventDefault()
    visibleMenu.value = true
    const x = event.clientX
    const y = event.clientY
    // 计算菜单的位置
    const menu = document.querySelector('.context-menu')
    const menuWidth = menu.offsetWidth
    const menuHeight = menu.offsetHeight
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    if (x + menuWidth > windowWidth) {
      contextMenuPos.x = windowWidth - menuWidth
    } else {
      contextMenuPos.x = x
    }
    if (y + menuHeight > windowHeight) {
      contextMenuPos.y = windowHeight - menuHeight
    } else {
      contextMenuPos.y = y
    }

    return false
  })

  // 处理鼠标点击事件
  window.addEventListener('click', (event) => {
    const x = event.clientX / clientWidth
    const y = event.clientY / clientHeight
    const intersections = selector.getPointerIntersects({ x, y }, camera, Object.values(idToObject))
    if (intersections.length > 0) {
      // determine closest intersection and highlight the respective 3D object
      const obj = intersections[0].object
      intersections.sort(sortIntersections)
      if (obj.geometry.type === 'TextGeometry') {
        console.log('text')
        return
      }
      if (selector.selected === obj) {
        return
      }
      dispatchSelected(intersections[0].object)
      intersections[0].object.add(hitbox)
    } else {
      const parent = hitbox.parent
      selector.select(null)
      transformControls.detach()
      if (parent) parent.remove(hitbox)
    }
  })
  // 双击文字编辑
  window.addEventListener('dblclick', (event) => {
    const x = event.clientX / clientWidth
    const y = event.clientY / clientHeight
    const intersections = selector.getPointerIntersects({ x, y }, camera, Object.values(idToObject))
    if (intersections.length > 0) {
      // determine closest intersection and highlight the respective 3D object
      const obj = intersections[0].object
      if (obj.geometry.type === 'TextGeometry') {
        editingText = obj
        // 编辑文字
        textValue.value = obj.userData.text

        editingPosition.x = event.clientX
        editingPosition.y = event.clientY
        nextTick(() => {
          inputRef.value.focus()
          inputRef.value.select()
        })
      }
    }
  })

  stats = useStats()
  console.log(stats)
}

async function dispatchSelected(object) {
  selector.select(object)
  transformControls.detach()
  transformControls.attach(object)
  // boxSelection.updateBoxHelper(object, transformControls)
  if (object) {
    const text3d = await textInstance.addText(`Hey,box`)
    object.add(text3d)
  }
  if (needAnimation.value) {
    // 相机飞行到三维场景中某个对象附近
    object.getWorldPosition(initialPos) //获取三维场景中某个对象世界坐标
    // 相机飞行到的位置和观察目标拉开一定的距离
    const pos2 = initialPos.clone().addScalar(5) //向量的x、y、z坐标分别在pos基础上增加30

    console.log(initialPos, pos2)

    // 相机从当前位置camera.position飞行三维场景中某个世界坐标附近
    const tween = new Tween({
      // 相机开始坐标
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      // 相机开始指向的目标观察点
      tx: 0,
      ty: 0,
      tz: 0,
    })
      .to(
        {
          // 相机结束坐标
          x: pos2.x,
          y: pos2.y,
          z: pos2.z,
          // 相机结束指向的目标观察点
          tx: initialPos.x,
          ty: initialPos.y,
          tz: initialPos.z,
        },
        2000,
      )
      .onUpdate(function (obj) {
        // 更新相机位置
        camera.position.set(obj.x, obj.y, obj.z)
        // 更新控制器目标点
        controls.target.set(obj.tx, obj.ty, obj.tz)
        controls.update()
      })
      // .easing(Easing.Quadratic.Out)
      .start()

    Groups.add(tween)
  }
}

const loadTexture = async (url) => {
  // 创建一个 RGBELoader 处理hdr格式的纹理
  const loader = new RGBELoader()
  try {
    const texture = await loader.loadAsync(url)
    // texture
    return texture
  } catch (error) {
    console.error('Failed to load texture:', error)
    return null
  }
}

const handleOperate = (type) => {
  let newObject = null
  switch (type) {
    case 'addCube':
      newObject = sceneOperations.addCube()
      break
    case 'addSphere':
      newObject = sceneOperations.addSphere()
      break
    case 'addPoint':
      newObject = sceneOperations.addPoint()
      break
    case 'deletePoint':
      // const lastPoint = sceneObjects.value.findLast((obj) => obj.type === 'point')
      // if (lastPoint) {
      //   sceneOperations.deleteObject(lastPoint.object)
      //   sceneObjects.value = sceneObjects.value.filter((obj) => obj !== lastPoint)
      // }
      break
    default:
      break
  }
  if (newObject) {
    scene.add(newObject)
    newObject.userData.obb = new OBB()
    idToObject[newObject.uuid] = newObject
    dispatchSelected(newObject)
    // boxSelection.updateBoxHelper(newObject, transformControls)
  }
  visibleMenu.value = false
}

const stopRotate = () => {
  objectRotate = !objectRotate
}

const handleRotate = (position) => {
  const selectedObject = selector.selected
  if (selectedObject) {
    selectedObject.rotation[position] += Math.PI / 4
  }
}

const onEditFinish = () => {
  textInstance.updateText(editingText, textValue.value)
  editingText = null
  textValue.value = ''
  editingPosition.x = -1
  editingPosition.y = -1
}

onMounted(() => {
  nextTick().then(() => {
    initScene()
  })
})
</script>

<template>
  <div style="width: 100%; height: 100%; overflow: hidden">
    <canvas ref="canvasRef" style="width: 100%; height: 100%"></canvas>
    <div
      class="context-menu"
      v-show="visibleMenu"
      :style="menuStyle"
      v-on-click-outside="() => (visibleMenu = false)"
    >
      <div
        class="menu-item"
        v-for="menu in menus"
        :key="menu.value"
        @click.prevent="handleOperate(menu.value)"
      >
        {{ menu.label }}
      </div>
    </div>
    <div @click="needAnimation = !needAnimation" class="switch-button">
      是否开启摄像头动画 {{ needAnimation }}
    </div>
    <div
      class="text-editor"
      v-show="editingPosition.x !== -1 && editingPosition.y !== -1"
      :style="{
        left: `${editingPosition.x}px`,
        top: `${editingPosition.y}px`,
      }"
    >
      <input
        type="text"
        @blur="onEditFinish"
        ref="inputRef"
        :value="textValue"
        autofocus
        @input="(e) => (textValue = e.target.value)"
      />
    </div>
    <div @click="handleRotate('x')" class="switch-button" style="top: 150px">旋转当前物体x</div>
    <div @click="stopRotate()" class="switch-button" style="top: 200px">旋转状态变更</div>
  </div>
</template>

<style scoped>
.context-menu {
  position: absolute;
  z-index: 1000;
  width: 120px;
  border-radius: 4px;
  background-color: #fff;
  box-shadow:
    0px 3px 6px -4px rgba(0, 0, 0, 0.12),
    0px 6px 16px 0px rgba(0, 0, 0, 0.08),
    0px 9px 28px 8px rgba(0, 0, 0, 0.05);
}
.menu-item {
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  user-select: none;
  &:hover {
    background-color: #f5f5f5;
  }
}
.switch-button {
  position: fixed;
  left: 50px;
  top: 50px;
  z-index: 1000;
  cursor: pointer;
  padding: 8px 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  user-select: none;
}
.text-editor {
  position: absolute;
  z-index: 1000;
  width: 120px;
}
</style>
