/**
 * Type definition for memory field descriptors with automatic offset calculation
 */
export type MemoryFieldDescriptor = {
  name: string;                     // Field name
  type: string;                     // Type name - standard types are 'i32', 'i64', 'f32', 'f64', 'funcPtr'
  offset?: number;                  // Optional: byte offset (calculated automatically if not provided)
};

/**
 * Standard WebAssembly types
 */
export const STANDARD_WASM_TYPES = ['i32', 'i64', 'f32', 'f64', 'funcPtr'];

/**
 * MemoryArrayAccessor - A flexible class to iterate through arrays in WebAssembly memory
 * with automatic offset calculation for fields
 */
export class MemoryArrayAccessor {
  private memory: WebAssembly.Memory;
  private functionTable: WebAssembly.Table;
  private arrayPtr: number;
  private count: number;
  private currentIndex: number = 0;
  private fields: Required<MemoryFieldDescriptor>[];  // Fields with calculated offsets
  private elementSize: number;
  
  /**
   * Creates a new accessor for an array in WebAssembly memory
   * 
   * @param memory WebAssembly memory containing the array
   * @param functionTable WebAssembly function table (needed for function pointers)
   * @param arrayPtr Pointer to the beginning of the array in memory
   * @param count Number of elements in the array
   * @param fields Array of field descriptors defining the structure of each element
   * @param elementSize Optional size of each element in bytes (calculated from fields if not provided)
   */
  constructor(
    memory: WebAssembly.Memory,
    functionTable: WebAssembly.Table,
    arrayPtr: number,
    count: number,
    fields: MemoryFieldDescriptor[],
    elementSize?: number
  ) {
    this.memory = memory;
    this.functionTable = functionTable;
    this.arrayPtr = arrayPtr;
    this.count = count;
    
    // Calculate field offsets if not provided
    this.fields = this.calculateFieldOffsets(fields);
    
    // Calculate the element size based on the fields or use provided size
    this.elementSize = elementSize || this.calculateElementSize();
    
    // Validate inputs
    if (count < 0) {
      throw new Error("MemoryArrayAccessor: Array count must be non-negative");
    }
    
    if (arrayPtr < 0 || (count > 0 && arrayPtr + (this.elementSize * count) > memory.buffer.byteLength)) {
      throw new Error("MemoryArrayAccessor: Array pointer is outside memory bounds");
    }
  }
  
  /**
   * Calculate offsets for fields that don't have them specified
   */
  private calculateFieldOffsets(
    fields: MemoryFieldDescriptor[]
  ): Required<MemoryFieldDescriptor>[] {
    const result: Required<MemoryFieldDescriptor>[] = [];
    let currentOffset = 0;
    
    for (const field of fields) {
      const fieldSize = this.getTypeSize(field.type);
      let offset: number;
      
      if (field.offset !== undefined) {
        // Use provided offset
        offset = field.offset;
      } else {
        // Simply place the field at the current offset
        offset = currentOffset;
      }
      
      // Add field with calculated offset
      result.push({
        name: field.name,
        type: field.type,
        offset
      });
      
      // Update current offset for next field
      currentOffset = offset + fieldSize;
    }
    
    return result;
  }
  
  /**
   * Calculates the total size of one element based on field descriptors
   */
  private calculateElementSize(): number {
    if (this.fields.length === 0) {
      throw new Error("MemoryArrayAccessor: No fields defined");
    }
    
    // Find the field with the highest offset + size
    let maxEnd = 0;
    
    for (const field of this.fields) {
      const fieldSize = this.getTypeSize(field.type);
      const fieldEnd = field.offset + fieldSize;
      
      if (fieldEnd > maxEnd) {
        maxEnd = fieldEnd;
      }
    }
    
    return maxEnd;
  }
  
  /**
   * Gets the size in bytes for a given type
   */
  private getTypeSize(type: string): number {
    switch (type) {
      case 'i32':
      case 'f32':
      case 'funcPtr': // Function pointers are 32-bit indices
        return 4;
      case 'i64':
      case 'f64':
        return 8;
      default:
        // For now, default to 4 bytes for unknown types with a warning
        console.warn(`MemoryArrayAccessor: Unknown type "${type}", defaulting to 4 bytes`);
        return 4;
    }
  }
  
  /**
   * Returns the calculated element size
   */
  getElementSize(): number {
    return this.elementSize;
  }
  
  /**
   * Returns the fields with their calculated offsets
   */
  getFields(): Required<MemoryFieldDescriptor>[] {
    return this.fields;
  }
  
  /**
   * Checks if there are more elements to iterate
   */
  hasNext(): boolean {
    return this.currentIndex < this.count;
  }
  
  /**
   * Gets the current index in the iteration
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }
  
  /**
   * Gets the total count of elements
   */
  getCount(): number {
    return this.count;
  }
  
  /**
   * Moves to the next element
   */
  next(): void {
    if (this.hasNext()) {
      this.currentIndex++;
    }
  }
  
  /**
   * Resets the iterator to the beginning of the array
   */
  reset(): void {
    this.currentIndex = 0;
  }
  
  /**
   * Gets the current element's pointer in memory
   */
  getCurrentElementPtr(): number {
    if (!this.hasNext()) {
      throw new Error("MemoryArrayAccessor: No more elements");
    }
    
    return this.arrayPtr + (this.currentIndex * this.elementSize);
  }
  
  /**
   * Gets a value from the current element based on a field name
   */
  getFieldValue(fieldName: string): any {
    const field = this.fields.find(f => f.name === fieldName);
    if (!field) {
      throw new Error(`MemoryArrayAccessor: Field "${fieldName}" not found`);
    }
    
    const elementPtr = this.getCurrentElementPtr();
    const fieldPtr = elementPtr + field.offset;
    const dataView = new DataView(this.memory.buffer);
    
    switch (field.type) {
      case 'i32':
        return dataView.getInt32(fieldPtr, true);
      case 'i64':
        return dataView.getBigInt64(fieldPtr, true);
      case 'f32':
        return dataView.getFloat32(fieldPtr, true);
      case 'f64':
        return dataView.getFloat64(fieldPtr, true);
      case 'funcPtr':
        const funcPtr = dataView.getUint32(fieldPtr, true);
        // Validate function pointer
        if (funcPtr >= this.functionTable.length || funcPtr < 0) {
          throw new Error(`MemoryArrayAccessor: Invalid function pointer ${funcPtr} at index ${this.currentIndex}`);
        }
        return funcPtr;
      default:
        throw new Error(`MemoryArrayAccessor: Unknown type "${field.type}"`);
    }
  }
  
  /**
   * Gets all field values for the current element as an object
   */
  getCurrentElement(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const field of this.fields) {
      result[field.name] = this.getFieldValue(field.name);
    }
    
    return result;
  }
  
  /**
   * Gets all elements as an array of objects
   */
  getAllElements(): Record<string, any>[] {
    const result: Record<string, any>[] = [];
    this.reset();
    
    while (this.hasNext()) {
      result.push(this.getCurrentElement());
      this.next();
    }
    
    this.reset();
    return result;
  }
  
  /**
   * Gets a specific field value from all elements
   */
  getFieldFromAllElements(fieldName: string): any[] {
    const result: any[] = [];
    this.reset();
    
    while (this.hasNext()) {
      result.push(this.getFieldValue(fieldName));
      this.next();
    }
    
    this.reset();
    return result;
  }
  
  /**
   * Creates a struct definition for a convenient way to define memory layouts
   */
  static createStructDefinition(fields: MemoryFieldDescriptor[]): Required<MemoryFieldDescriptor>[] {
    let currentOffset = 0;
    const result: Required<MemoryFieldDescriptor>[] = [];
    
    for (const field of fields) {
      let fieldSize: number;
      
      switch (field.type) {
        case 'i32':
        case 'f32':
        case 'funcPtr':
          fieldSize = 4;
          break;
        case 'i64':
        case 'f64':
          fieldSize = 8;
          break;
        default:
          console.warn(`Unknown type: ${field.type}, defaulting to 4 bytes`);
          fieldSize = 4;
          break;
      }
      
      let offset: number;
      if (field.offset !== undefined) {
        offset = field.offset;
      } else {
        // Simply place field at current offset
        offset = currentOffset;
      }
      
      result.push({
        name: field.name,
        type: field.type,
        offset
      });
      
      // Update offset for next field
      currentOffset = offset + fieldSize;
    }
    
    return result;
  }
}

/**
 * Helper function to calculate struct layout and total size
 */
export function calculateStructLayout(
  fields: MemoryFieldDescriptor[]
): { fields: Required<MemoryFieldDescriptor>[], size: number } {
  const layoutFields = MemoryArrayAccessor.createStructDefinition(fields);
  
  // Calculate struct size from the last field's offset + size
  let maxEnd = 0;
  for (const field of layoutFields) {
    let fieldSize = 4; // Default size
    
    switch (field.type) {
      case 'i64':
      case 'f64':
        fieldSize = 8;
        break;
      case 'i32':
      case 'f32':
      case 'funcPtr':
        fieldSize = 4;
        break;
    }
    
    const fieldEnd = field.offset + fieldSize;
    if (fieldEnd > maxEnd) {
      maxEnd = fieldEnd;
    }
  }
  
  return {
    fields: layoutFields,
    size: maxEnd
  };
}