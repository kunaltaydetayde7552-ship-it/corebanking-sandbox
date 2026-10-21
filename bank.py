#!/usr/bin/env python3
"""
bank.py - CoreBanking Sandbox Python 3 Companion CLI Helper
Project ID: PST_PD_153
Batch / Level: 2026 Level 2 (Core)
Team: Kunal Tayde, Gajangi Nikhileshwar
Mentor: Madhushri Tangali

Implements identical core banking rules and invariants:
- Negative balances strictly blocked unless overdraftEnabled is True
- Overdraft limit bounded
- Double-entry transfer accounting (atomic debit and credit legs)
- SHA-256 hash-chained ledger for tamper detection
- Persistent JSON file storage (bank_data.json)
"""

import sys
import os
import json
import hashlib
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bank_data.json")

def get_iso_timestamp() -> str:
    return datetime.now().astimezone().strftime("%Y-%m-%dT%H:%M:%S.000Z")

def calculate_hash(prev_hash: str, txn_dict: Dict[str, Any]) -> str:
    content = f"{prev_hash or 'GENESIS'}|{txn_dict.get('id')}|{txn_dict.get('accountId')}|{txn_dict.get('amount')}|{txn_dict.get('type')}|{txn_dict.get('direction')}|{txn_dict.get('timestamp')}"
    return hashlib.sha256(content.encode("utf-8")).hexdigest()

@dataclass
class Account:
    id: str
    customerId: str
    accountNumber: str
    accountType: str
    balance: float
    overdraftEnabled: bool = False
    overdraftLimit: float = 0.0
    status: str = "active"
    createdAt: str = ""

@dataclass
class Transaction:
    id: str
    accountId: str
    accountNumber: str
    type: str  # deposit, withdrawal, transfer
    direction: str  # credit, debit
    amount: float
    balance: float
    description: str
    referenceId: Optional[str] = None
    timestamp: str = ""
    prevHash: str = "GENESIS"
    hash: str = ""

class Bank:
    def __init__(self, data_path: str = DATA_FILE):
        self.data_path = data_path
        self.customers: List[Dict[str, Any]] = []
        self.accounts: List[Account] = []
        self.transactions: List[Transaction] = []
        self.load_or_seed()

    def get_seed_data(self) -> Dict[str, Any]:
        customers = [
            {"id": "CUST-001", "firstName": "Rahul", "lastName": "Sharma", "email": "rahul.sharma@example.com", "phone": "9876543210"},
            {"id": "CUST-002", "firstName": "Priya", "lastName": "Patel", "email": "priya.patel@example.com", "phone": "9876543211"},
            {"id": "CUST-003", "firstName": "Amit", "lastName": "Kumar", "email": "amit.kumar@example.com", "phone": "9876543212"}
        ]
        accounts = [
            Account("ACC-001", "CUST-001", "1001000001", "savings", 50000.00, False, 0.0, "active", get_iso_timestamp()),
            Account("ACC-002", "CUST-001", "1001000002", "current", 150000.00, True, 50000.00, "active", get_iso_timestamp()),
            Account("ACC-003", "CUST-002", "1001000003", "savings", 75000.00, False, 0.0, "active", get_iso_timestamp()),
            Account("ACC-004", "CUST-003", "1001000004", "savings", 25000.00, False, 0.0, "active", get_iso_timestamp()),
        ]
        raw_txns = [
            {"id": "TXN-001", "accountId": "ACC-001", "accountNumber": "1001000001", "type": "deposit", "direction": "credit", "amount": 60000.00, "balance": 60000.00, "description": "Initial account opening deposit", "referenceId": None, "timestamp": "2026-01-10T09:35:00.000Z"},
            {"id": "TXN-002", "accountId": "ACC-001", "accountNumber": "1001000001", "type": "withdrawal", "direction": "debit", "amount": 10000.00, "balance": 50000.00, "description": "ATM cash withdrawal", "referenceId": None, "timestamp": "2026-01-14T14:20:00.000Z"},
            {"id": "TXN-003", "accountId": "ACC-002", "accountNumber": "1001000002", "type": "deposit", "direction": "credit", "amount": 200000.00, "balance": 200000.00, "description": "Business invoice deposit", "referenceId": None, "timestamp": "2026-01-11T11:15:00.000Z"},
            {"id": "TXN-004", "accountId": "ACC-002", "accountNumber": "1001000002", "type": "withdrawal", "direction": "debit", "amount": 50000.00, "balance": 150000.00, "description": "Vendor payment", "referenceId": None, "timestamp": "2026-01-16T16:45:00.000Z"},
            {"id": "TXN-005", "accountId": "ACC-003", "accountNumber": "1001000003", "type": "deposit", "direction": "credit", "amount": 70000.00, "balance": 70000.00, "description": "Initial account opening deposit", "referenceId": None, "timestamp": "2026-01-12T11:05:00.000Z"},
            {"id": "TXN-006", "accountId": "ACC-004", "accountNumber": "1001000004", "type": "deposit", "direction": "credit", "amount": 30000.00, "balance": 30000.00, "description": "Initial savings deposit", "referenceId": None, "timestamp": "2026-01-15T15:05:00.000Z"},
            {"id": "TXN-007", "accountId": "ACC-004", "accountNumber": "1001000004", "type": "transfer", "direction": "debit", "amount": 5000.00, "balance": 25000.00, "description": "Transfer to ACC-003", "referenceId": "ACC-003", "timestamp": "2026-01-18T10:10:00.000Z"},
            {"id": "TXN-008", "accountId": "ACC-003", "accountNumber": "1001000003", "type": "transfer", "direction": "credit", "amount": 5000.00, "balance": 75000.00, "description": "Transfer from ACC-004", "referenceId": "ACC-004", "timestamp": "2026-01-18T10:10:00.000Z"}
        ]

        txns: List[Transaction] = []
        prev_hash = "GENESIS"
        for rt in raw_txns:
            h = calculate_hash(prev_hash, rt)
            t = Transaction(**rt, prevHash=prev_hash, hash=h)
            txns.append(t)
            prev_hash = h

        return {"customers": customers, "accounts": accounts, "transactions": txns}

    def load_or_seed(self):
        if not os.path.exists(self.data_path):
            seed = self.get_seed_data()
            self.customers = seed["customers"]
            self.accounts = seed["accounts"]
            self.transactions = seed["transactions"]
            self.save()
        else:
            try:
                with open(self.data_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.customers = data.get("customers", [])
                self.accounts = [Account(**a) for a in data.get("accounts", [])]
                self.transactions = [Transaction(**t) for t in data.get("transactions", [])]
            except Exception:
                seed = self.get_seed_data()
                self.customers = seed["customers"]
                self.accounts = seed["accounts"]
                self.transactions = seed["transactions"]
                self.save()

    def save(self):
        data = {
            "customers": self.customers,
            "accounts": [asdict(a) for a in self.accounts],
            "transactions": [asdict(t) for t in self.transactions]
        }
        with open(self.data_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def find_account(self, identifier: str) -> Optional[Account]:
        clean = identifier.strip().upper()
        for a in self.accounts:
            if a.id.upper() == clean or a.accountNumber.upper() == clean:
                return a
        return None

    def transfer(self, from_id: str, to_id: str, amount: float, description: str = "") -> Dict[str, Any]:
        if amount <= 0:
            raise ValueError("Enter an amount greater than ₹0.00.")

        from_acc = self.find_account(from_id)
        if not from_acc:
            raise ValueError(f"Source account '{from_id}' not found.")

        to_acc = self.find_account(to_id)
        if not to_acc:
            raise ValueError(f"Destination account '{to_id}' not found.")

        if from_acc.id == to_acc.id:
            raise ValueError("Choose two different accounts to transfer between.")

        if from_acc.status != "active":
            raise ValueError(f"Source account {from_acc.accountNumber} is {from_acc.status}.")
        if to_acc.status != "active":
            raise ValueError(f"Destination account {to_acc.accountNumber} is {to_acc.status}.")

        od_limit = from_acc.overdraftLimit if from_acc.overdraftEnabled else 0.0
        max_available = round(from_acc.balance + od_limit, 2)

        if amount > max_available:
            if from_acc.overdraftEnabled:
                raise ValueError(
                    f"Transfer blocked. {from_acc.accountNumber} has INR {from_acc.balance:.2f} balance with INR {od_limit:.2f} overdraft (Total available: INR {max_available:.2f})."
                )
            else:
                raise ValueError(
                    f"Transfer blocked. {from_acc.accountNumber} has INR {from_acc.balance:.2f} available and no overdraft."
                )

        from_acc.balance = round(from_acc.balance - amount, 2)
        to_acc.balance = round(to_acc.balance + amount, 2)
        ts = get_iso_timestamp()

        next_idx = len(self.transactions) + 1
        d_id = f"TXN-{next_idx:03d}"
        c_id = f"TXN-{next_idx+1:03d}"

        prev_h = self.transactions[-1].hash if self.transactions else "GENESIS"

        d_raw = {
            "id": d_id, "accountId": from_acc.id, "accountNumber": from_acc.accountNumber,
            "type": "transfer", "direction": "debit", "amount": amount, "balance": from_acc.balance,
            "description": description or f"Transfer to {to_acc.accountNumber}", "referenceId": to_acc.id,
            "timestamp": ts
        }
        d_hash = calculate_hash(prev_h, d_raw)
        d_txn = Transaction(**d_raw, prevHash=prev_h, hash=d_hash)

        c_raw = {
            "id": c_id, "accountId": to_acc.id, "accountNumber": to_acc.accountNumber,
            "type": "transfer", "direction": "credit", "amount": amount, "balance": to_acc.balance,
            "description": description or f"Transfer from {from_acc.accountNumber}", "referenceId": from_acc.id,
            "timestamp": ts
        }
        c_hash = calculate_hash(d_hash, c_raw)
        c_txn = Transaction(**c_raw, prevHash=d_hash, hash=c_hash)

        self.transactions.extend([d_txn, c_txn])
        self.save()

        return {
            "debitTxn": asdict(d_txn),
            "creditTxn": asdict(c_txn),
            "fromBalance": from_acc.balance,
            "toBalance": to_acc.balance
        }

    def print_statement(self, identifier: str):
        acc = self.find_account(identifier)
        if not acc:
            print(f"Error: Account '{identifier}' not found.")
            return

        txns = [t for t in self.transactions if t.accountId == acc.id]
        print(f"\n==========================================================================")
        print(f" ACCOUNT STATEMENT: {acc.accountNumber} ({acc.accountType.upper()})")
        print(f" Status: {acc.status.upper()} | Overdraft: {'ENABLED (Limit: INR ' + str(acc.overdraftLimit) + ')' if acc.overdraftEnabled else 'DISABLED'}")
        print(f" Current Balance: INR {acc.balance:,.2f}")
        print(f"==========================================================================")
        print(f"{'Date/Time':<24} {'Txn ID':<10} {'Description':<28} {'Debit':>12} {'Credit':>12} {'Running Bal':>14}")
        print(f"-" * 105)

        running = 0.0
        for t in txns:
            debit_str = f"INR {t.amount:,.2f}" if t.direction == "debit" else "-"
            credit_str = f"INR {t.amount:,.2f}" if t.direction == "credit" else "-"
            if t.direction == "credit":
                running = round(running + t.amount, 2)
            else:
                running = round(running - t.amount, 2)
            print(f"{t.timestamp[:19]:<24} {t.id:<10} {t.description[:26]:<28} {debit_str:>12} {credit_str:>12} {f'INR {running:,.2f}':>14}")

        print(f"==========================================================================")
        print(f" Closing Reconciled Balance: INR {running:,.2f}\n")

    def print_accounts(self):
        print(f"\n==========================================================================")
        print(f" COREBANKING SANDBOX - ACCOUNTS LEDGER")
        print(f"==========================================================================")
        print(f"{'Account No':<14} {'Cust ID':<10} {'Type':<10} {'Status':<10} {'Overdraft':<12} {'Balance':>16}")
        print(f"-" * 78)
        for a in self.accounts:
            od_str = f"INR {a.overdraftLimit:,.0f}" if a.overdraftEnabled else "No"
            print(f"{a.accountNumber:<14} {a.customerId:<10} {a.accountType:<10} {a.status:<10} {od_str:<12} {f'INR {a.balance:,.2f}':>16}")
        print(f"==========================================================================\n")

def main():
    bank = Bank()
    if len(sys.argv) < 2:
        print("\nUsage:")
        print("  python bank.py accounts                     - List all accounts")
        print("  python bank.py statement <accountNumber>    - Print statement with running balance")
        print("  python bank.py transfer <from> <to> <amt>   - Execute transfer between accounts")
        print("  python bank.py reset                        - Reset sandbox data to demo defaults\n")
        return

    cmd = sys.argv[1].lower()
    if cmd == "accounts":
        bank.print_accounts()
    elif cmd == "statement":
        if len(sys.argv) < 3:
            print("Usage: python bank.py statement <accountNumber>")
            return
        bank.print_statement(sys.argv[2])
    elif cmd == "transfer":
        if len(sys.argv) < 5:
            print("Usage: python bank.py transfer <fromAccount> <toAccount> <amount> [description]")
            return
        from_acc = sys.argv[2]
        to_acc = sys.argv[3]
        try:
            amt = float(sys.argv[4])
        except ValueError:
            print("Error: Amount must be a valid number.")
            return
        desc = " ".join(sys.argv[5:]) if len(sys.argv) > 5 else "CLI transfer"
        try:
            res = bank.transfer(from_acc, to_acc, amt, desc)
            print(f"\n[OK] Transfer complete. INR {amt:,.2f} sent from {from_acc} to {to_acc}.")
            print(f"  New {from_acc} Balance: INR {res['fromBalance']:,.2f}")
            print(f"  New {to_acc} Balance: INR {res['toBalance']:,.2f}\n")
        except ValueError as e:
            print(f"\n[BLOCK] {e}\n")
    elif cmd == "reset":
        if os.path.exists(DATA_FILE):
            os.remove(DATA_FILE)
        bank.load_or_seed()
        print("\n[OK] CoreBanking Sandbox data file reset to clean sample state.\n")
    else:
        print(f"Unknown command: {cmd}")

if __name__ == "__main__":
    main()
