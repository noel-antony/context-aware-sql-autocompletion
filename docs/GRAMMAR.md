# SQL Subset Grammar

The compiler supports a strictly defined subset of SQL, focusing on the standard `SELECT` query lifecycle. 

## Keywords Supported

`SELECT`, `FROM`, `WHERE`, `JOIN`, `ON`, `GROUP`, `BY`, `HAVING`, `ORDER`, `ASC`, `DESC`, `LIMIT`, `AND`, `OR`, `NOT`, `IS`, `NULL`, `AS`, `LIKE`.

## Operators Supported

`=`, `!=`, `<>`, `>`, `<`, `>=`, `<=`.

## Formal Grammar Rules

The Abstract Syntax Tree (AST) parser enforces the following simplified Grammar (EBNF-like):

```ebnf
query ::= select_clause 
          [from_clause] 
          [join_clause]* 
          [where_clause] 
          [group_by_clause] 
          [having_clause] 
          [order_by_clause] 
          [limit_clause]

select_clause ::= "SELECT" select_item ("," select_item)*
select_item ::= ("*" | column_ref | literal) ["AS" identifier]

from_clause ::= "FROM" table_ref
table_ref ::= identifier ["AS" identifier]

join_clause ::= "JOIN" table_ref "ON" expression

where_clause ::= "WHERE" expression
group_by_clause ::= "GROUP" "BY" column_ref ("," column_ref)*
having_clause ::= "HAVING" expression
order_by_clause ::= "ORDER" "BY" order_item ("," order_item)*
order_item ::= column_ref ["ASC" | "DESC"]
limit_clause ::= "LIMIT" integer_literal

expression ::= boolean_expression
boolean_expression ::= condition (("AND" | "OR") condition)*
condition ::= column_ref operator (column_ref | literal)
            | column_ref "IS" ["NOT"] "NULL"
            | "(" expression ")"
```

## Tolerant Prefix Parsing

While the grammar above dictates the AST construction, the **Prefix Parser** allows for partial strings. For example: `SELECT s.name FROM Student s WHERE s.cgp` is not a valid grammar node, but the prefix parser will identify the state as `WHERE_LEFT_OPERAND`.
