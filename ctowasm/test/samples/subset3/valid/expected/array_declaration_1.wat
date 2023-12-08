(module
	(import "js" "mem" (memory 1))
	(import "imports" "print_int" (func $print_int_o (param i32)))
	(global $sp (mut i32) (i32.const 65516))
	(global $bp (mut i32) (i32.const 65536))
	(global $hp (mut i32) (i32.const 0))
	(global $r1 (mut i32) (i32.const 0))
	(global $r2 (mut i32) (i32.const 0))
	(func $main
	)
	(func $print_int
		(call $print_int_o (i32.sub (global.get $bp) (i32.const 4)))
	)
	(start $main)
)
