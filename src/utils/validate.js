export function validateBody(age, weight, height) {
  const errors = {}

  // 🔥 1. Базовая валидация (диапазоны)
  if (!age || age < 10 || age > 100) {
    errors.age = 'Возраст от 10 до 100 лет'
  }
  if (!weight || weight < 30 || weight > 300) {
    errors.weight = 'Вес от 30 до 300 кг'
  }
  if (!height || height < 100 || height > 250) {
    errors.height = 'Рост от 100 до 250 см'
  }

  // 🔥 2. Проверка комбинаций (чтобы не было 10 лет / 220 см / 200 кг)
  if (age && weight && height && !errors.age && !errors.weight && !errors.height) {
    const bmi = weight / ((height / 100) ** 2)
    
    // 🔥 Возраст + Рост (дети не могут быть слишком высокими)
    if (age < 14 && height > 200) {
      errors._absurd = true
      errors.height = 'Некорректный рост для возраста'
    }
    if (age < 12 && height > 180) {
      errors._absurd = true
      errors.height = 'Некорректный рост для возраста'
    }
    if (age < 10 && height > 160) {
      errors._absurd = true
      errors.height = 'Некорректный рост для возраста'
    }

    // 🔥 Возраст + Вес (дети не могут весить слишком много)
    if (age < 14 && weight > 140) {
      errors._absurd = true
      errors.weight = 'Некорректный вес для возраста'
    }
    if (age < 12 && weight > 100) {
      errors._absurd = true
      errors.weight = 'Некорректный вес для возраста'
    }
    if (age < 10 && weight > 100) {
      errors._absurd = true
      errors.weight = 'Некорректный вес для возраста'
    }

    // 🔥 BMI проверка (слишком экстремальные значения)
    if (bmi < 12 || bmi > 70) {
      errors._absurd = true
      errors.weight = 'Некорректное соотношение веса и роста'
    }

    // 🔥 Рост + Вес (проверка на абсурд)
    if (height > 200 && weight < 50) {
      errors._absurd = true
      errors.weight = 'Некорректное соотношение веса и роста'
    }
    if (height < 150 && weight > 150) {
      errors._absurd = true
      errors.weight = 'Некорректное соотношение веса и роста'
    }
  }

  return errors
}
