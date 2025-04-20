import { Box3, Box3Helper, AxesHelper } from 'three/src/Three.WebGPU'
export default function useHelpers() {
  function boxHelper() {
    const box = new Box3()

    const selectionBox = new Box3Helper(box)
    selectionBox.material.depthTest = false
    selectionBox.material.transparent = true
    selectionBox.visible = false
    return {
      selectionBox,
      box,
      updateBoxHelper(object, transformControls) {
        selectionBox.visible = false
        if (transformControls) {
          transformControls.detach()
        }

        if (object !== null) {
          // 计算包围盒
          box.setFromObject(object, true)

          if (box.isEmpty() === false) {
            selectionBox.visible = true
          }
          if (transformControls) {
            transformControls.attach(object)
          }
        }
      },
    }
  }
  function axesHelper(size = 20) {
    return new AxesHelper(size)
  }
  return {
    boxHelper,
    axesHelper,
  }
}
