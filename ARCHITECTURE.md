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

### 7.1. Database Technology Stack
* **RDBMS:** PostgreSQL (Chosen as the most suitable, reliable, and open-source solution for the system's relational data structure).
* **Local Environment:** Docker (Ensures the exact same database version runs smoothly on all 5 team members' computers without local setup conflicts).
* **Integration:** An ORM (Object-Relational Mapping) tool will be used to standardize data exchange with the Backend team.

### 7.2. Entity-Relationship (ER) Model
The following model illustrates the core data structures of the system (Customers, Workers, Services, and Bookings) and their relationships:

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : "places"
    USERS ||--|| WORKER_PROFILES : "has_profile"
    
    USERS {
        int id PK
        string full_name
        string email
        string password_hash
        string role "ENUM: 'customer', 'worker'"
        string phone
    }

    WORKER_PROFILES ||--o{ BOOKINGS : "assigned_to"
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
        string name "e.g., Electrician, Plumber"
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
8.1. Local Deployment (Development Stage)
Since the project is currently in the development and demo stage, the database will not run on a physical cloud server. Instead, it will run in an isolated container environment on the developers' local machines.

Host Machine: Developer's local computer (Localhost).

Containerization: Docker Engine.

Network & Port: The database will communicate with the Backend server over an isolated Docker network and will be exposed on port 5432.

Data Persistence: To prevent data loss when the container stops, a Docker Volume will be used to map the database files to the local disk.
graph TD
    Client[Frontend: React/HTML Browser] -->|HTTP / REST API| Backend[Backend: Node.js/Python Server]
    
    subgraph Developer Machine (Localhost)
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
