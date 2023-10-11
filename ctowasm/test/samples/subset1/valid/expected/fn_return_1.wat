(module
	(func $f
		(result i32)
		(return (i32.const 1))
	)
	(func $main
		(drop (call $f))
	)
	(start $main)
)
