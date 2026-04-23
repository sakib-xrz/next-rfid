"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UploadCloud } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { COURSE_OPTIONS } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(6, "Phone is required"),
  car_number: z.string().min(2, "Car number is required"),
  course: z.enum(COURSE_OPTIONS),
  licenseFront: z.instanceof(File, { message: "Front image is required" }),
  licenseBack: z.instanceof(File, { message: "Back image is required" }),
});

type FormValues = z.infer<typeof formSchema>;

export function RequestJoinDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      car_number: "",
      course: "DIPLOMA",
    },
  });

  async function uploadLicense(file: File, type: "front" | "back") {
    const extension = file.name.split(".").pop() || "jpg";
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const safeName = baseName.replace(/[^a-zA-Z0-9-]/g, "-");
    const path = `requests/${type}-${file.lastModified}-${safeName}.${extension}`;
    const { error } = await supabase.storage.from("licenses").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) throw error;
    return path;
  }

  async function onSubmit(values: FormValues) {
    try {
      setIsSubmitting(true);
      const [frontPath, backPath] = await Promise.all([
        uploadLicense(values.licenseFront, "front"),
        uploadLicense(values.licenseBack, "back"),
      ]);

      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          phone: values.phone,
          car_number: values.car_number,
          course: values.course,
          license_front_url: frontPath,
          license_back_url: backPath,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to submit request");
      }

      toast.success("Request submitted successfully. Await admin approval.");
      form.reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-11 rounded-full px-6">
          Request to Join
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Join Car Attendance System</DialogTitle>
          <DialogDescription>
            Fill in your profile and upload both sides of your driving license.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input {...form.register("name")} placeholder="Full name" />
              <p className="text-xs text-destructive">{form.formState.errors.name?.message}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input {...form.register("email")} placeholder="name@company.com" />
              <p className="text-xs text-destructive">{form.formState.errors.email?.message}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input {...form.register("phone")} placeholder="+8801XXXXXXXXX" />
              <p className="text-xs text-destructive">{form.formState.errors.phone?.message}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Car Number</Label>
              <Input {...form.register("car_number")} placeholder="DHAKA METRO XX-1234" />
              <p className="text-xs text-destructive">
                {form.formState.errors.car_number?.message}
              </p>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Course</Label>
              <Controller
                control={form.control}
                name="course"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COURSE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-destructive">{form.formState.errors.course?.message}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>License Front</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  form.setValue("licenseFront", event.target.files?.[0] as File, {
                    shouldValidate: true,
                  })
                }
              />
              <p className="text-xs text-destructive">
                {form.formState.errors.licenseFront?.message}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>License Back</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  form.setValue("licenseBack", event.target.files?.[0] as File, {
                    shouldValidate: true,
                  })
                }
              />
              <p className="text-xs text-destructive">
                {form.formState.errors.licenseBack?.message}
              </p>
            </div>
          </div>

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <UploadCloud className="size-4" />
                Submit Request
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
