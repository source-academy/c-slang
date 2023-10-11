(module
	(func $f
		(result i32)
		(return (i32.const 1))
	)
	(func $main
		(local $x_0 i32)
		(local.set $x_0 (call $f))
		(drop (call $f))
	)
	(start $main)
)
