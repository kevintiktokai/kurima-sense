"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const FieldMap = dynamic(() => import("@/components/field-map"), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-muted/10 animate-pulse rounded-xl">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    ),
})

export default FieldMap
