export function getStoryboardAspectRatio(storyboard, projectAspectRatio = '16:9') {
  return storyboard?.aspect_ratio || projectAspectRatio || '16:9'
}
