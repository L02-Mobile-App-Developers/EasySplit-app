import TopAppBar from "@/components/TopAppBar";
import { ReactNode } from "react";

type Props = {
  title?: string;
  bonus?: ReactNode;
};

export default function Header({ title, bonus }: Props) {
  return <TopAppBar title={title} showBack rightContent={bonus} />;
}
