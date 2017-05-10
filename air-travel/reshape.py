import pandas as pd


df = pd.read_csv('air-travel-data.csv')
df = df.dropna()
df['total_passenger'] = df['air_carrier'] + df['air_taxi'] 
rs = df.pivot(index='date', columns='facility', values='total_operations')

print rs.describe()
print rs.head()

rs.to_csv('air-travel-data-reshape.csv')