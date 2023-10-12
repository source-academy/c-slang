(module
	(func $main
		(local $i_0 i32)
		(local.set $i_0 (i32.const 0))
		(block $block_0 (loop $loop_0 (br_if $block_0 (i32.eqz (i32.lt_s (local.get $i_0) (i32.const 10)))) (local.set $i_0 (i32.add (local.get $i_0) (i32.const 1))) (br $loop_0)))
	)
	(start $main)
)
