(module
	(memory 1)
	(global $sp (mut i32) (i32.const 65528))
	(global $bp (mut i32) (i32.const 65536))
	(global $hp (mut i32) (i32.const 0))
	(global $r1 (mut i32) (i32.const 0))
	(global $r2 (mut i32) (i32.const 0))
	(func $main
		(i32.store (i32.sub (global.get $bp) (i32.const 4)) (i32.const 1))
		(i32.store (i32.sub (global.get $bp) (i32.const 8)) (i32.const 0))
		(block $block_0 (loop $loop_0 (br_if $block_0 (i32.eqz (i32.lt_s (i32.load (i32.sub (global.get $bp) (i32.const 8))) (i32.const 10)))) (i32.store (i32.sub (global.get $bp) (i32.const 4)) (i32.add (i32.load (i32.sub (global.get $bp) (i32.const 4))) (i32.const 1))) (i32.store (i32.sub (global.get $bp) (i32.const 8)) (i32.add (i32.load (i32.sub (global.get $bp) (i32.const 8))) (i32.const 1))) (br $loop_0)))
	)
	(start $main)
)
