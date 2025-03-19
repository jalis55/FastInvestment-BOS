import React from 'react'

const Registration = () => {
    return (
        <main
            class="mx-auto flex min-h-screen w-full items-center justify-center bg-gray-900 text-white"
        >

            <section class="flex w-[30rem] flex-col space-y-10">
                <div class="text-center text-4xl font-medium">Registration</div>

                <div
                    class="w-full transform border-b-2 bg-transparent text-lg duration-300 focus-within:border-indigo-500"
                >
                    <input
                        type="text"
                        placeholder="Email"
                        class="w-full border-none bg-transparent outline-none placeholder:italic focus:outline-none"
                    />
                </div>

                <div
                    class="w-full transform border-b-2 bg-transparent text-lg duration-300 focus-within:border-indigo-500"
                >
                    <input
                        type="password"
                        placeholder="Password"
                        class="w-full border-none bg-transparent outline-none placeholder:italic focus:outline-none"
                    />
                </div>

                <div
                    class="w-full transform border-b-2 bg-transparent text-lg duration-300 focus-within:border-indigo-500"
                >
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        class="w-full border-none bg-transparent outline-none placeholder:italic focus:outline-none"
                    />
                </div>

                <button
                    class="transform rounded-sm bg-indigo-600 py-2 font-bold duration-300 hover:bg-indigo-400"
                >
                    Register
                </button>


                <p class="text-center text-lg">
                    Have account?
                    <a
                        href="#"
                        class="font-medium text-indigo-500 underline-offset-4 hover:underline"
                    >Login</a
                    >
                </p>
            </section>
        </main>

    )
}

export default Registration;
