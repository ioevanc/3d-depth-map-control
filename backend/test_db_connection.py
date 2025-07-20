#!/usr/bin/env python3
"""
Test database connection
"""
import pymysql
import sys

# Test different variations
tests = [
    {
        'name': 'Test 1: threed-db user, threed-db database',
        'host': 'localhost',
        'user': 'threed-db',
        'password': 'BHjD1W7D4VUiOuAnl6DR',
        'database': 'threed-db'
    },
    {
        'name': 'Test 2: threed-db user, threed_db database',
        'host': 'localhost', 
        'user': 'threed-db',
        'password': 'BHjD1W7D4VUiOuAnl6DR',
        'database': 'threed_db'
    },
    {
        'name': 'Test 3: threed_db user, threed_db database',
        'host': 'localhost',
        'user': 'threed_db', 
        'password': 'BHjD1W7D4VUiOuAnl6DR',
        'database': 'threed_db'
    },
    {
        'name': 'Test 4: threed user, threed database',
        'host': 'localhost',
        'user': 'threed',
        'password': 'BHjD1W7D4VUiOuAnl6DR', 
        'database': 'threed'
    }
]

for test in tests:
    print(f"\n{test['name']}...")
    try:
        connection = pymysql.connect(
            host=test['host'],
            user=test['user'],
            password=test['password'],
            database=test['database']
        )
        print(f"✓ Success! Connected to {test['database']} as {test['user']}")
        connection.close()
        sys.exit(0)
    except Exception as e:
        print(f"✗ Failed: {str(e)}")

print("\nAll connection attempts failed. Please verify the credentials.")