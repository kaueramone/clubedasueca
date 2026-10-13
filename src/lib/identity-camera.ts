// Map the visible guide through object-fit: cover to the original camera pixels.
export function cameraCrop(videoWidth: number, videoHeight: number, viewportWidth: number, viewportHeight: number, guideWidth: number, guideHeight: number) {
  if ([videoWidth, videoHeight, viewportWidth, viewportHeight, guideWidth, guideHeight].some(n => !Number.isFinite(n) || n <= 0)) throw new Error('A câmara ainda não está pronta.')
  const scale = Math.max(viewportWidth / videoWidth, viewportHeight / videoHeight)
  // Leave a small margin around the guide so card edges are not cut off.
  const width = Math.min(videoWidth, guideWidth * 1.08 / scale)
  const height = Math.min(videoHeight, guideHeight * 1.08 / scale)
  return { x: (videoWidth - width) / 2, y: (videoHeight - height) / 2, width, height }
}

export function cameraError(error: unknown) {
  const name = error instanceof Error ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Permita o acesso à câmara nas definições do navegador ou escolha uma fotografia da galeria.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Não foi encontrada uma câmara. Pode escolher uma fotografia da galeria.'
  if (name === 'NotReadableError' || name === 'AbortError') return 'Não foi possível abrir a câmara. Feche outras aplicações que a estejam a utilizar e tente novamente.'
  return 'Não foi possível utilizar a câmara. Tente novamente ou escolha uma fotografia da galeria.'
}
