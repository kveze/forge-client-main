export function validateBody(age, weight, height) {
  const errors = {}

  if (!age || age < 10 || age > 100) errors.age = 'Возраст от 10 до 100 лет'
  if (!weight || weight < 30 || weight > 300) errors.weight = 'Вес от 30 до 300 кг'
  if (!height || height < 100 || height > 250) errors.height = 'Рост от 100 до 250 см'

  if (age && weight && height && !errors.age && !errors.weight && !errors.height) {
    const bmi = weight / ((height / 100) ** 2)

    if (age < 14 && height > 200) {
      errors._absurd = true
      errors.height = 'Некорректный рост для возраста'
    } else if (age < 12 && height > 180) {
      errors._absurd = true
      errors.height = 'Некорректный рост для возраста'
    } else if (age < 10 && height > 160) {
      errors._absurd = true
      errors.height = 'Некорректный рост для возраста'
    }

    if (age < 14 && weight > 140) {
      errors._absurd = true
      errors.weight = 'Некорректный вес для возраста'
    } else if (age < 12 && weight > 100) {
      errors._absurd = true
      errors.weight = 'Некорректный вес для возраста'
    }

    if (bmi < 12 || bmi > 70) {
      errors._absurd = true
      errors.weight = 'Некорректное соотношение веса и роста'
    } else if (height > 200 && weight < 50) {
      errors._absurd = true
      errors.weight = 'Некорректное соотношение веса и роста'
    } else if (height < 150 && weight > 150) {
      errors._absurd = true
      errors.weight = 'Некорректное соотношение веса и роста'
    }
  }

  return errors
}
