/**
 * Flattens the object - it'll return an object one level deep, regardless of how nested the original object was
 * @param target 
 * @param opts 
 * @returns 
 */
export function flatten<T extends Record<string, any>>(target: T, opts: { delimiter?: string } = {}) {
  const delimiter = opts.delimiter || '.'
  const output: Record<string, string> = {}

  function step (object: T, prev = "") {
    Object.keys(object).forEach(function (key) {
      const value = object[key]
      const type = Object.prototype.toString.call(value)
      const isobject = (
        type === '[object Object]' ||
        type === '[object Array]'
      )

      const newKey = prev
        ? prev + delimiter + key
        : key

      if (isobject && Object.keys(value).length) {
        return step(value, newKey)
      }

      output[newKey] = value
    })
  }

  step(target)

  return output
}