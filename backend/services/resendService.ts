import { Resend } from "resend";
import { Request, Response } from "express";

const resend = new Resend('re_T1KhBNvd_8wNwBWmV5uZwn2X2tgyhPHMf');

export const mailSender = async (req: Request, res: Response) : Promise<any> => {
    try {
        const { data, error } = await resend.emails.send({
          from: "Acme <kumaryatin449@gmail.com>",
          to: ["yatin.2022ug1074@iiitranchi.ac.in"],
          subject: "hello world the mail is working",
          html: "<strong>it works!</strong>",
        });
        res.status(200).json({ data });
    } catch (error) {
        return res.status(400).json({ error });
    }
}