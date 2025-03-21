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

projecet_id (optional)

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

### 4. Create Project
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
### 5. Project Balance Details
+ Endpoint: /api/stock/project-balance-details/<project-id>/
+ Method: GET
+ Permissions: AllowAny

```
response
{
  "project_id": "55",
  "total_investment": "1000.00",
  "total_buy_amount": "379.56",
  "available_balance": "620.44",
  "total_sell_amount": "270.88",
  "total_gain_loss": "-108.68",
  "total_sell_balance": "270.88"
}
```
### 6. Sellable Instrument
+ Endpoint: /api/stock/sellable-instruments/<project_id>/
+ Method: GET
+ Permissions: AllowAny

```
response
[
  {
    "instrument_id": 153,
    "name": "MBL1STMF",
    "available_quantity": 14,
    "average_buy_unit_price": 15.06
  },
  {
    "instrument_id": 169,
    "name": "AIBLPBOND",
    "available_quantity": 12,
    "average_buy_unit_price": 14.06
  }
]
```
### 7. Add Investment
+ Endpoint: /api/stock/add-investment/
+ Method: POST
+ Permissions: AllowAny
```
json
{
   "project":55,
   "investor":2,
   "amount":5000
}
```
### 8. Investor contribute Percentage
+ Endpoint: /api/stock/investor-contrib-percent/<project-id>/
+ Method: GET
+ Permissions: AllowAny
```
response
[
  {
    "investor": 13,
    "contribute_amount": "1000.00",
    "contribution_percentage": "100.00"
  }
]

```
### 9. Add Financial Advisor
+ Endpoint: /api/stock/add-financial-advisor/
+ Method: POST
+ Permissions: AllowAny
```
json
{
  "project":55,
  "advisor":2,
  "comm_percentage":20
}
```
### 10.Financial Advisors Commission
+ Endpoint: /api/stock/fin-advisor-commission/<project_id>/
+ Method: GET
+ Permissions: AllowAny

```
response
[
  {
    "project": "55",
    "advisor": {
      "id": 1,
      "email": "jalis@admin.com",
      "name": "jalis mahamud tarif"
    },
    "com_percentage": "20.00"
  }
]
```
### 11.Create Account Receivable
+ Endpoint: /api/stock/create-acc-recvable/
+ Method: POST
+ Permissions: AllowAny
```
JSON
{
"project":55,
"investor":3,
"trade":"ed625898-f0d2-4816-9817-f089a307312a"
"contribute_amount":2000,
"percentage":20
"gain_loss":100
}
```
### 12.Account Receivable Details
+ Endpoint: /api/stock/create-acc-recvable/
+ Method: GET
+ Permissions: AllowAny
#### Parameters

projecet_id (optional)

form_dt and to_dt (optional)
disburse_st (optional)
```
```
response
[
  {
    "project": "55",
    "investor": {
      "id": 13,
      "email": "user@example.com",
      "name": "User  Name"
    },
    "trade": {
      "instrument": {
        "id": 146,
        "name": "GBBPOWER"
      },
      "qty": 1,
      "unit_price": "11.00",
      "total_commission": "0.04",
      "actual_unit_price": "10.96",
      "trade_date": "2025-03-18",
      "authorized_by": {
        "id": 1,
        "email": "jalis@admin.com",
        "name": "jalis mahamud tarif"
      }
    },
    "contribute_amount": "1000.00",
    "percentage": "100.00",
    "gain_lose": "-1.09",
    "is_advisor": false
  }
]
```
GET /api/stock/acc-recvable-details/?project_id=55&from_dt=2025-03-18&to_dt=2025-03-18&disburse_st=1
```
### 13.Update Account Receivable
+ Endpoint: /api/stock/update-acc-recvable/
+ Method: PUT
+ Permissions: AllowAny

```
json
{
"project_id":4,
"from_dt":"2025-02-02"
"to_dt":"2025-03-02"
"user_ids":[1,2,3]
}
```