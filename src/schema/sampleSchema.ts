/**
 * Sample Database Schemas
 *
 * Two schemas for testing and demonstration:
 * 1. University schema (Student, Department, Course, Enrollment)
 * 2. E-commerce schema (Product, Category, Order, OrderItem)
 */

import { SchemaDef, ColumnType } from './schemaTypes';

// ─── University Schema ────────────────────────────────────────────

export const universitySchema: SchemaDef = {
  name: 'University',
  tables: [
    {
      name: 'Student',
      columns: [
        { name: 'id', type: ColumnType.INT, isPrimaryKey: true, nullable: false },
        { name: 'name', type: ColumnType.TEXT, isPrimaryKey: false, nullable: false },
        { name: 'department_id', type: ColumnType.INT, isPrimaryKey: false, nullable: true },
        { name: 'cgpa', type: ColumnType.FLOAT, isPrimaryKey: false, nullable: true },
      ],
      foreignKeys: [
        { column: 'department_id', refTable: 'Department', refColumn: 'id' },
      ],
    },
    {
      name: 'Department',
      columns: [
        { name: 'id', type: ColumnType.INT, isPrimaryKey: true, nullable: false },
        { name: 'name', type: ColumnType.TEXT, isPrimaryKey: false, nullable: false },
      ],
      foreignKeys: [],
    },
    {
      name: 'Course',
      columns: [
        { name: 'id', type: ColumnType.INT, isPrimaryKey: true, nullable: false },
        { name: 'name', type: ColumnType.TEXT, isPrimaryKey: false, nullable: false },
        { name: 'credits', type: ColumnType.INT, isPrimaryKey: false, nullable: false },
        { name: 'department_id', type: ColumnType.INT, isPrimaryKey: false, nullable: true },
      ],
      foreignKeys: [
        { column: 'department_id', refTable: 'Department', refColumn: 'id' },
      ],
    },
    {
      name: 'Enrollment',
      columns: [
        { name: 'student_id', type: ColumnType.INT, isPrimaryKey: true, nullable: false },
        { name: 'course_id', type: ColumnType.INT, isPrimaryKey: true, nullable: false },
        { name: 'semester', type: ColumnType.TEXT, isPrimaryKey: false, nullable: false },
        { name: 'grade', type: ColumnType.TEXT, isPrimaryKey: false, nullable: true },
      ],
      foreignKeys: [
        { column: 'student_id', refTable: 'Student', refColumn: 'id' },
        { column: 'course_id', refTable: 'Course', refColumn: 'id' },
      ],
    },
  ],
};

// ─── E-Commerce Schema ────────────────────────────────────────────

export const ecommerceSchema: SchemaDef = {
  name: 'E-Commerce',
  tables: [
    {
      name: 'Product',
      columns: [
        { name: 'id', type: ColumnType.INT, isPrimaryKey: true, nullable: false },
        { name: 'name', type: ColumnType.TEXT, isPrimaryKey: false, nullable: false },
        { name: 'price', type: ColumnType.FLOAT, isPrimaryKey: false, nullable: false },
        { name: 'category_id', type: ColumnType.INT, isPrimaryKey: false, nullable: true },
        { name: 'in_stock', type: ColumnType.BOOLEAN, isPrimaryKey: false, nullable: false },
      ],
      foreignKeys: [
        { column: 'category_id', refTable: 'Category', refColumn: 'id' },
      ],
    },
    {
      name: 'Category',
      columns: [
        { name: 'id', type: ColumnType.INT, isPrimaryKey: true, nullable: false },
        { name: 'name', type: ColumnType.TEXT, isPrimaryKey: false, nullable: false },
        { name: 'description', type: ColumnType.TEXT, isPrimaryKey: false, nullable: true },
      ],
      foreignKeys: [],
    },
    {
      name: 'CustomerOrder',
      columns: [
        { name: 'id', type: ColumnType.INT, isPrimaryKey: true, nullable: false },
        { name: 'customer_name', type: ColumnType.TEXT, isPrimaryKey: false, nullable: false },
        { name: 'order_date', type: ColumnType.TEXT, isPrimaryKey: false, nullable: false },
        { name: 'total', type: ColumnType.FLOAT, isPrimaryKey: false, nullable: false },
      ],
      foreignKeys: [],
    },
    {
      name: 'OrderItem',
      columns: [
        { name: 'id', type: ColumnType.INT, isPrimaryKey: true, nullable: false },
        { name: 'order_id', type: ColumnType.INT, isPrimaryKey: false, nullable: false },
        { name: 'product_id', type: ColumnType.INT, isPrimaryKey: false, nullable: false },
        { name: 'quantity', type: ColumnType.INT, isPrimaryKey: false, nullable: false },
        { name: 'unit_price', type: ColumnType.FLOAT, isPrimaryKey: false, nullable: false },
      ],
      foreignKeys: [
        { column: 'order_id', refTable: 'CustomerOrder', refColumn: 'id' },
        { column: 'product_id', refTable: 'Product', refColumn: 'id' },
      ],
    },
  ],
};
