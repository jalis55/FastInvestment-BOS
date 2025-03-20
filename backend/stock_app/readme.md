# API Endpoints


### 1. Instrument list
+ Endpoint: /api/stock/instruments/
+ Method: GET
+ Permissions: AllowAny


### 2. Create Trade
+ Endpoint: /api/stock/create-trade/
+ Method: POST
+ Permissions: AllowAny
```
JSON
{
  "project": 55,
  "instrument": 4,
  "qty":500,
  "unit_price":24.5,
  "trns_type":"Buy/Sell"

}

```

### 3. Trade Details
+ Endpoint: /api/stock/trade-details/
+ Method: GET
+ Permissions: AllowAny

#### Parameters

projecet_id(optional)

form_dt and to_dt (optional)
```
GET /api/trades/?project_id=55&from_dt=2025-01-01&to_dt=2025-01-31
```
```
Response
[
    {
        "project": 10,
        "id": 1,
        "trade_date": "2025-01-15",
        "instrument": {
            "id": 5,
            "name": "Instrument Name",
            "type": "Stock"
        },
        "qty": 100,
        "unit_price": 50.0,
        "trns_type": "buy",
        "total_commission": 25.0,
        "actual_unit_price": 50.25
    },
    ...
]


```

### 4.Create Project
+ Endpoint: /api/stock/create-project/
+ Method: POST
+ Permissions: AllowAny

```
json
{
"project_title":"test",
"project_description":"test description"
}

```
```
response
{
  "project_id": "58564520",
  "project_title": "test project",
  "project_description": "test description",
  "created_by": 1
}
```

## License

[MIT](https://choosealicense.com/licenses/mit/)