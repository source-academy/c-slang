(module
	(memory 1)
	(global $sp (mut i32) (i32.const 65536))
	(global $bp (mut i32) (i32.const 65536))
	(global $hp (mut i32) (i32.const 0))
	(global $r1 (mut i32) (i32.const 0))
	(global $r2 (mut i32) (i32.const 0))
	(func $f
		(result i32)
		(return (i32.const 1))
	)
	(func $main
	)
	(start $main)
)
