import { Injectable } from '@nestjs/common';

@Injectable()
export class RateLimiterService {
  private readonly store = new Map<string, number[]>();

  isLimited(key: string, max = 5, windowMs = 10_000): boolean {
    const now = Date.now();
    const from = now - windowMs;

    // Получаем текущие временные метки для ключа, или пустой массив
    const currentTimestamps = this.store.get(key) ?? [];

    // Добавляем временную метку текущего запроса
    currentTimestamps.push(now);

    // Отфильтровываем временные метки, которые старше 'from'
    const recentTimestamps = currentTimestamps.filter((ts) => ts >= from);

    // Обновляем хранилище очищенным списком недавних временных меток
    this.store.set(key, recentTimestamps);

    // Проверяем, превышает ли количество недавних запросов максимально допустимое
    // Используем > max, потому что 'max' запросов разрешены, а (max+1)-й блокируется.
    return recentTimestamps.length > max;
  }

  clearAll(): void {
    this.store.clear();
    console.log('✅ Rate limiter cleared');
  }

  clearKey(key: string): void {
    this.store.delete(key);
  }
}
