import React from "react";
import {
    SignInButton,
    SignUpButton,
    UserButton,
    Show
} from "@clerk/react";

function Navbar() {
    return (
        <div className="flex justify-between items-center px-8 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg">
            <h1 className="text-xl font-bold">PaperBridge</h1>

            <div>

                <Show when="signed-out" >
                    <SignInButton mode="modal">
                        <button className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition duration-200 font-medium shadow mr-4">
                            Sign In
                        </button>
                    </SignInButton>

                    <SignUpButton mode="modal">
                        <button className="px-5 py-2 rounded-lg bg-green-500 hover:bg-green-600 transition duration-200 font-medium shadow mr-4">
                            Sign Up
                        </button>
                    </SignUpButton>
                </Show>





                <Show when="signed-in">
                    <div className="flex items-center gap-4 ml-6 mr-6">
                        <UserButton />
                    </div>
                </Show>

            </div>
        </div>
    );
}


export default Navbar;