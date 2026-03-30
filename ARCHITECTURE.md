## Home Service Management System - software Architecture

## 1. Scope
(To be filled)

## 2. References
(To be filled)

## 3. Software Architecture
(To be filled)

## 4. Architectural Goals & Constraints
(To be filled)

## 5. Logical Architecture
(To be filled)


## 6. Process Architecture
(To be filled)

## 7. Development Architecture
## 7. Development Architecture

### 7.1. Database Technology Stack
* **RDBMS:** PostgreSQL (Sistemin ilişkisel veri yapısına en uygun, güvenilir ve açık kaynaklı çözüm olduğu için tercih edilmiştir).
* **Local Environment:** Docker (Tüm 5 kişilik ekibin bilgisayarlarında aynı veritabanı sürümünün sorunsuz çalışabilmesi için).
* **Integration:** Backend ekibiyle veri alışverişini standartlaştırmak adına bir ORM (Object-Relational Mapping) aracı kullanılacaktır.

### 7.2. Entity-Relationship (ER) Model
Aşağıdaki model, sistemin temel veri yapılarını (Müşteriler, Çalışanlar, Hizmetler ve Randevular) ve aralarındaki ilişkileri göstermektedir:

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : "places (Müşteri)"
    USERS ||--|| WORKER_PROFILES : "has (Çalışan ise)"
    
    USERS {
        int id PK
        string full_name
        string email
        string password_hash
        string role "ENUM: 'customer', 'worker'"
        string phone
    }

    WORKER_PROFILES ||--o{ BOOKINGS : "assigned_to (İşi yapan)"
    WORKER_PROFILES }o--|| SERVICE_CATEGORIES : "provides"
    
    WORKER_PROFILES {
        int id PK
        int user_id FK
        int category_id FK
        float average_rating
        boolean is_available
    }

    SERVICE_CATEGORIES {
        int id PK
        string name "Örn: Electrician, Plumber"
        string description
    }

    BOOKINGS {
        int id PK
        int customer_id FK
        int worker_id FK
        datetime scheduled_for
        string status "ENUM: 'pending', 'accepted', 'completed'"
        text service_address
    }

## 8. Physical Architecture
graph TD
    Client[Frontend: React/HTML Browser] -->|HTTP / REST API| Backend[Backend: Node.js/Python Server]
    
    subgraph Geliştirici Bilgisayarı (Localhost)
        Backend -->|TCP/IP: 5432| DB[(PostgreSQL Database)]
    end
    
    classDef storage fill:#f9f,stroke:#333,stroke-width:2px;
    class DB storage;

## 9. Scenarios
(To be filled)

## 10. Size and Performance
(To be filled)

## 11. Quality
(To be filled)
