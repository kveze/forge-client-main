// Единый источник правды для валидации тела пользователя.
// Используется и в Generate, и в Profile.

export const BODY_LIMITS = {
  age:    { min: 12, max: 80 },
  weight: { min: 30, max: 200 },
  height: { min: 120, max: 220 },
}

// Подростковые потолки (применяются если age < 14)
const TEEN_HEIGHT_MAX = 200
const TEEN_WEIGHT_MAX = 140

// BMI диапазон "разумного" — за его пределами считаем что данные нереальны
const BMI_MIN = 13
const BMI_MAX = 55

function isOutOfRange(value, { min, max }) {
  return value < min || value > max
}

function isAbsurdRatio(weight, height) {
  const bmi = weight / ((height / 100) ** 2)
  if (bmi < BMI_MIN || bmi > BMI_MAX) return true
  if (height > 200 && weight < 50) return true
  if (height < 150 && weight > 130) return true
  return false
}

/**
 * Валидация всех body-полей сразу.
 * Принимает строки или числа (формы хранят строки).
 * Возвращает { age?, weight?, height?, _absurd? } — поля с текстами ошибок.
 *
 * @param {object} form    { age, weight, height }
 * @param {object} options { heightOptional?: boolean }
 */
export function validateBody(form, options = {}) {
  const { heightOptional = false } = options
  const errors = {}

  const age = Number(form.age)
  const weight = Number(form.weight)
  const height = Number(form.height)

  if (!form.age || isNaN(age) || isOutOfRange(age, BODY_LIMITS.age)) {
    errors.age = `Возраст от ${BODY_LIMITS.age.min} до ${BODY_LIMITS.age.max} лет`
  }

  if (!form.weight || isNaN(weight) || isOutOfRange(weight, BODY_LIMITS.weight)) {
    errors.weight = `Вес от ${BODY_LIMITS.weight.min} до ${BODY_LIMITS.weight.max} кг`
  }

  const heightProvided = !!form.height
  if (!heightOptional && !heightProvided) {
    errors.height = `Рост от ${BODY_LIMITS.height.min} до ${BODY_LIMITS.height.max} см`
  } else if (heightProvided && (isNaN(height) || isOutOfRange(height, BODY_LIMITS.height))) {
    errors.height = `Рост от ${BODY_LIMITS.height.min} до ${BODY_LIMITS.height.max} см`
  }

  const baseValid = !errors.age && !errors.weight
  if (baseValid && age < 14) {
    if (heightProvided && !errors.height && height > TEEN_HEIGHT_MAX) {
      errors.height = 'Рост слишком большой для возраста'
      errors._absurd = true
    }
    if (weight > TEEN_WEIGHT_MAX) {
      errors.weight = 'Вес слишком большой для возраста'
      errors._absurd = true
    }
  }

  if (baseValid && heightProvided && !errors.height && isAbsurdRatio(weight, height)) {
    errors.weight = errors.weight || 'Проверь рост и вес — не сходится'
    errors._absurd = true
  }

  return errors
}

// Backward-compat: старая сигнатура validateBody(age, weight, height).
// Если где-то ещё используется — будет работать. В новом коде НЕ использовать.
export function validateBodyLegacy(age, weight, height) {
  return validateBody({ age, weight, height })
}
