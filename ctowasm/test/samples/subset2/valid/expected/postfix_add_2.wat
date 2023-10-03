(module
	(func $main
		(local $x_0 i32)
		(local.set $x_0 (i32.const 10))
		(local.set $x_0 (local.set $x_0 (i32.add (local.get $x_0 (local.get $x_0)) (i32.const 1))))
	)
	(start $main)
)
