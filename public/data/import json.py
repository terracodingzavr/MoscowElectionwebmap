import json
from collections import OrderedDict
import re

# Путь к вашему исходному файлу
INPUT_PATH  = r'C:\Users\kerAki\Desktop\map-demo\public\data\uik_gd_2016.geojson'
OUTPUT_PATH = r'C:\Users\kerAki\Desktop\map-demo\public\data\uik_gd_2016_percent.geojson'

# Загружаем с сохранением порядка ключей
with open(INPUT_PATH, 'r', encoding='utf-8') as f:
    geo = json.load(f, object_pairs_hook=OrderedDict)

prefix = '2016_duma_'

for feat in geo['features']:
    props = feat['properties']
    # находим ключи с голосами за партии (префикс + заглавная буква)
    party_keys = [
        k for k in props
        if k.startswith(prefix)
           and len(k) > len(prefix)
           and isinstance(props[k], (int, float))
           and k[len(prefix)].isupper()
    ]
    # считаем сумму, пропуская None
    total = sum((props[k] or 0) for k in party_keys)

    # Пересчитываем или обнуляем
    if total > 0:
        for k in party_keys:
            votes = props[k] or 0
            props[k] = (votes / total) * 100
    else:
        for k in party_keys:
            props[k] = 0

# Записываем назад с отступом 2 пробела, без изменения порядка ключей
with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    json.dump(geo, f, ensure_ascii=False, indent=2)

print("Новый файл с процентами сохранён:", OUTPUT_PATH)